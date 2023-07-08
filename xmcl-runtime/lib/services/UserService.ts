/* eslint-disable quotes */
import { DownloadTask } from '@xmcl/installer'
import {
  UserService as IUserService,
  LoginOptions,
  MutableState,
  SaveSkinOptions, UploadSkinOptions,
  UserProfile,
  UserSchema,
  UserServiceKey,
  UserState,
} from '@xmcl/runtime-api'
import { Pool } from 'undici'
import { UserAccountSystem } from '../accountSystems/AccountSystem'
import { YggdrasilAccountSystem } from '../accountSystems/YggdrasilAccountSystem'
import LauncherApp from '../app/LauncherApp'
import { LauncherAppKey } from '../app/utils'
import { loadYggdrasilApiProfile } from '../entities/user'
import { UserTokenStorage, kUserTokenStorage } from '../entities/userTokenStore'
import { requireObject, requireString } from '../util/object'
import { Inject } from '../util/objectRegistry'
import { createSafeFile } from '../util/persistance'
import { ensureLauncherProfile, preprocessUserData } from '../util/userData'
import { ExposeServiceKey, Lock, Singleton, StatefulService } from './Service'
import debounce from 'lodash.debounce'

@ExposeServiceKey(UserServiceKey)
export class UserService extends StatefulService<UserState> implements IUserService {
  private userFile = createSafeFile(this.getAppDataPath('user.json'), UserSchema, this, [this.getPath('user.json')])
  private saveUserFile = debounce(async () => {
    const userData: UserSchema = {
      users: this.state.users,
      clientToken: this.state.clientToken,
      yggdrasilServices: this.state.yggdrasilServices,
    }
    await this.userFile.write(userData)
  }, 1000)

  private loginController: AbortController | undefined
  private refreshController: AbortController | undefined
  private setSkinController: AbortController | undefined
  private accountSystems: Record<string, UserAccountSystem | undefined> = {}
  private mojangSelectedUserId = ''

  readonly yggdrasilAccountSystem: YggdrasilAccountSystem

  constructor(@Inject(LauncherAppKey) app: LauncherApp,
    @Inject(kUserTokenStorage) private tokenStorage: UserTokenStorage) {
    super(app, () => new UserState(), async () => {
      const data = await this.userFile.read()
      const userData: UserSchema = {
        users: {},
        clientToken: '',
        yggdrasilServices: [],
      }

      const shouldRefillData = data.yggdrasilServices.length === 0 && Object.keys(data.users).length === 0
      // This will fill the user data
      const { mojangSelectedUserId } = await preprocessUserData(userData, data, this.getMinecraftPath('launcher_profiles.json'), tokenStorage)
      this.mojangSelectedUserId = mojangSelectedUserId
      // Ensure the launcher profile
      await ensureLauncherProfile(this.getPath())

      this.log(`Load ${Object.keys(userData.users).length} users`)

      this.state.userData(userData)

      if (shouldRefillData) {
        // Initialize the data
        Promise.all([
          loadYggdrasilApiProfile('https://littleskin.cn/api/yggdrasil').then(api => {
            this.state.userYggdrasilServicePut(api)
          }),
          loadYggdrasilApiProfile('https://authserver.ely.by/api/authlib-injector').then(api => {
            this.state.userYggdrasilServicePut(api)
          })])
      }
    })

    const dispatcher = this.networkManager.registerAPIFactoryInterceptor((origin, options) => {
      const hosts = this.state.yggdrasilServices.map(v => new URL(v.url).hostname)
      if (hosts.indexOf(origin.hostname) !== -1) {
        return new Pool(origin, {
          ...options,
          pipelining: 1,
          connections: 6,
          keepAliveMaxTimeout: 60_000,
        })
      }
    })

    this.yggdrasilAccountSystem = new YggdrasilAccountSystem(
      this,
      dispatcher,
      this.state,
      tokenStorage,
    )

    this.storeManager.subscribeAll([
      'userProfile',
      'userProfileRemove',
      'userGameProfileSelect',
      'userYggdrasilServices',
      'userYggdrasilServicePut',
    ], async () => {
      this.saveUserFile()
    })

    app.protocol.registerHandler('authlib-injector', ({ request, response }) => {
      this.addYggdrasilAccountSystem(request.url.pathname)
    })
  }

  async getUserState(): Promise<MutableState<UserState>> {
    return this.state
  }

  async getMojangSelectedUser(): Promise<string> {
    return this.mojangSelectedUserId
  }

  async addYggdrasilAccountSystem(url: string): Promise<void> {
    if (url.startsWith('authlib-injector:')) url = url.substring('authlib-injector:'.length)
    if (url.startsWith('yggdrasil-server:')) url = url.substring('yggdrasil-server:'.length)
    url = decodeURIComponent(url)
    const parsed = new URL(url)
    const domain = parsed.host

    this.log(`Add ${url} as yggdrasil (authlib-injector) api service ${domain}`)

    const api = await loadYggdrasilApiProfile(url)
    this.state.userYggdrasilServicePut(api)
  }

  async removeYggdrasilAccountSystem(url: string): Promise<void> {
    const all = this.state.yggdrasilServices
    this.state.userYggdrasilServices(all.filter(a => a.url !== url))
  }

  @Lock('login')
  async login(options: LoginOptions): Promise<UserProfile> {
    const system = this.accountSystems[options.service] || this.yggdrasilAccountSystem

    this.loginController = new AbortController()

    const profile = await system.login(options, this.loginController.signal)
      .finally(() => { this.loginController = undefined })

    this.state.userProfile(profile)
    return profile
  }

  async putUser(userProfile: UserProfile): Promise<void> {
    this.state.userProfile(userProfile)
  }

  registerAccountSystem(name: string, system: UserAccountSystem) {
    this.accountSystems[name] = system
  }

  getClientToken() {
    return this.state.clientToken
  }

  @Lock('uploadSkin')
  async uploadSkin(options: UploadSkinOptions) {
    requireObject(options)

    const {
      gameProfileId,
      userId,
      skin,
    } = options
    const user = this.state.users[userId]
    const gameProfile = user.profiles[gameProfileId || user.selectedProfile]

    const sys = this.accountSystems[user.authService] || this.yggdrasilAccountSystem

    if (skin) {
      if (typeof skin.slim !== 'boolean') skin.slim = false
    }

    this.log(`Upload texture ${gameProfile.name}(${gameProfile.id})`)

    this.setSkinController = new AbortController()
    const data = await sys.setSkin(user, gameProfile, options, this.setSkinController.signal).finally(() => {
      this.setSkinController = undefined
    })
    this.state.userProfile(data)
  }

  /**
   * Save the skin to the disk.
   */
  async saveSkin(options: SaveSkinOptions) {
    requireObject(options)
    requireString(options.url)
    requireString(options.path)
    const { path, url } = options
    await new DownloadTask({ url, destination: path, ...this.networkManager.getDownloadBaseOptions() }).startAndWait()
  }

  /**
   * Refresh the current user login status
   */
  @Lock('refreshUser')
  async refreshUser(userId: string) {
    const user = this.state.users[userId]

    if (!user) {
      this.log('Skip refresh user status as the user is empty.')
      return
    }

    const system = this.accountSystems[user.authService] || this.yggdrasilAccountSystem
    this.refreshController = new AbortController()

    const newUser = await system.refresh(user, this.refreshController.signal).finally(() => {
      this.refreshController = undefined
    })

    this.state.userProfile(newUser)
  }

  async selectGameProfile(userId: string, profileId: string) {
    const user = this.state.users[userId]?.profiles?.[profileId]
    if (!user) {
      return
    }

    this.state.userGameProfileSelect({ userId, profileId })
  }

  @Singleton(id => id)
  async removeUser(userId: string) {
    requireString(userId)
    this.state.userProfileRemove(userId)
  }

  async getOfficialUserProfile(): Promise<(UserProfile & { accessToken: string | undefined }) | undefined> {
    const official = Object.values(this.state.users).find(u => u.authService === 'microsoft')
    if (official) {
      const controller = new AbortController()
      await this.accountSystems.microsoft?.refresh(official, controller.signal)
      const accessToken = await this.tokenStorage.get(official)
      return { ...official, accessToken }
    }
    return undefined
  }

  async abortLogin(): Promise<void> {
    this.loginController?.abort()
  }

  async abortRefresh() {
    this.refreshController?.abort()
  }

  getAccountSystem(service: string) {
    return this.accountSystems[service]
  }
}
