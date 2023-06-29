import { OfficialUserService as IOfficialUserService, OfficialUserServiceKey, UserException, UserProfile } from '@xmcl/runtime-api'
import { MicrosoftAuthenticator, MojangChallengeResponse, MojangClient, YggdrasilClient } from '@xmcl/user'
import { Client } from 'undici'
import { MicrosoftAccountSystem } from '../accountSystems/MicrosoftAccountSystem'
import LauncherApp from '../app/LauncherApp'
import { LauncherAppKey } from '../app/utils'
import { MicrosoftOAuthClient } from '../clients/MicrosoftOAuthClient'
import { CLIENT_ID, IS_DEV } from '../constant'
import { normalizeGameProfile } from '../entities/user'
import { UserTokenStorage, kUserTokenStorage } from '../entities/userTokenStore'
import { AnyError, isSystemError } from '../util/error'
import { toRecord } from '../util/object'
import { Inject } from '../util/objectRegistry'
import { AbstractService, ExposeServiceKey } from './Service'
import { UserService } from './UserService'

const UserAuthenticationError = AnyError.make('UserAuthenticationError')

@ExposeServiceKey(OfficialUserServiceKey)
export class OfficialUserService extends AbstractService implements IOfficialUserService {
  private mojangApi: MojangClient

  constructor(@Inject(LauncherAppKey) app: LauncherApp,
    @Inject(kUserTokenStorage) private userTokenStorage: UserTokenStorage,
    @Inject(UserService) private userService: UserService) {
    super(app)

    const dispatcher = this.networkManager.registerAPIFactoryInterceptor((origin, opts) => {
      if (origin.hostname === 'api.minecraftservices.com' || origin.hostname === 'api.mojang.com') {
        // keep alive for a long time
        return new Client(origin, { ...opts, pipelining: 6 })
      }
      if (origin.hostname === 'login.microsoftonline.com' || origin.hostname === 'user.auth.xboxlive.com' || origin.hostname === 'xsts.auth.xboxlive.com' || origin.hostname === 'profile.xboxlive.com' || origin.hostname === 'authserver.mojang.com' || origin.hostname === 'textures.minecraft.net') {
        // short connection for authenticate connection
        return new Client(origin, { ...opts, pipelining: 6, keepAliveMaxTimeout: 10e3 })
      }
    })

    this.mojangApi = new MojangClient(dispatcher)

    const system = new MicrosoftAccountSystem(this,
      new MicrosoftAuthenticator(dispatcher),
      this.mojangApi,
      userTokenStorage,
      new MicrosoftOAuthClient(this,
        CLIENT_ID,
        async (url, signal) => {
          this.app.shell.openInBrowser(url)
          this.emit('microsoft-authorize-url', url)
          return await new Promise<string>((resolve, reject) => {
            const abort = () => {
              reject(new Error('Timeout to wait the auth code! Please try again later!'))
            }
            (signal as any)?.addEventListener('abort', abort)
            this.once('microsoft-authorize-code', (err, code) => {
              if (err) {
                reject(err)
              } else {
                resolve(code!)
              }
            })
          })
        },
        async (directRedirectToLauncher) => {
          if (IS_DEV) directRedirectToLauncher = true
          const port = await app.localhostServerPort ?? 25555
          return (directRedirectToLauncher ? `http://localhost:${port}/auth` : `https://xmcl.app/auth?port=${port}`)
        },
        (response) => {
          this.emit('device-code', response)
          app.shell.openInBrowser(response.verificationUri)
        },
        this.app.secretStorage,
        dispatcher,
      ))

    userService.registerAccountSystem('microsoft', system)

    const headers = {}
    const legacyClient = new YggdrasilClient('https://authserver.mojang.com', {
      dispatcher,
      headers,
    })
    userService.registerAccountSystem('mojang', {
      login: async (options) => {
        const result = await legacyClient.login({
          username: options.username,
          password: options.password ?? '',
          requestUser: true,
          clientToken: userService.getClientToken(),
        })
          .catch((e) => {
            if (e.message && e.message.startsWith('getaddrinfo ENOTFOUND')) {
              throw new UserException({ type: 'loginInternetNotConnected' }, e.message)
            } else if (e.error === 'ForbiddenOperationException' &&
              e.errorMessage === 'Invalid credentials. Invalid username or password.') {
              throw new UserException({ type: 'loginInvalidCredentials' }, e.message)
            } else if (e.error === 'ForbiddenOperationException' &&
              e.errorMessage === 'Invalid credential information.') {
              throw new UserException({ type: 'loginInvalidCredentials' }, e.message)
            } else if (isSystemError(e)) {
              if (e.code === 'ETIMEDOUT') {
                throw new UserException({ type: 'loginTimeout' }, e.message)
              } else if (e.code === 'ECONNRESET') {
                throw new UserException({ type: 'loginReset' }, e.message)
              }
            }
            throw new UserException({ type: 'loginGeneral' }, e.message)
          })

        const userProfile: UserProfile = {
          id: result.user!.id,
          username: options.username,
          invalidated: false,
          profiles: toRecord(result.availableProfiles.map(normalizeGameProfile), (v) => v.id),
          selectedProfile: result.selectedProfile?.id ?? '',
          expiredAt: Date.now() + 86400_000,
          authService: options.service,
        }

        await this.userTokenStorage.put(userProfile, result.accessToken)

        return userProfile
      },
      refresh: async (user) => {
        const token = await this.userTokenStorage.get(user)
        if (!token) {
          // TODO: error
          return user
        }
        const valid = await legacyClient.validate(token, userService.getClientToken())

        this.log(`Validate ${user.authService} user access token: ${valid ? 'valid' : 'invalid'}`)

        if (valid) {
          return user
        }
        try {
          const result = await legacyClient.refresh({
            accessToken: token,
            requestUser: true,
            clientToken: userService.getClientToken(),
          })
          this.log(`Refreshed user access token for user: ${user.id}`)

          this.userTokenStorage.put(user, result.accessToken)
          user.expiredAt = Date.now() + 86400_000
        } catch (e) {
          this.warn(e)
          this.warn(`Invalid current user ${user.id} accessToken!`)
        }
        return user
      },
      setSkin: system.setSkin.bind(system),
    })

    app.protocol.registerHandler('xmcl', ({ request, response }) => {
      const parsed = request.url
      if (parsed.host === 'launcher' && parsed.pathname === '/auth') {
        let error: Error | undefined
        if (parsed.searchParams.get('error')) {
          const err = parsed.searchParams.get('error')!
          const errDescription = parsed.searchParams.get('error')!
          error = new Error(unescape(errDescription));
          (error as any).error = err
        }
        const code = parsed.searchParams.get('code') as string
        this.emit('microsoft-authorize-code', error, code)
        response.status = 200
      }
    })
  }

  async setName(user: UserProfile, name: string) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    await this.mojangApi.setName(name, token)
  }

  async getNameChangeInformation(user: UserProfile) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    const result = await this.mojangApi.getNameChangeInformation(token)
    return result
  }

  async checkNameAvailability(user: UserProfile, name: string) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    const result = await this.mojangApi.checkNameAvailability(name, token)
    return result
  }

  async hideCape(user: UserProfile) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    await this.mojangApi.hideCape(token)
  }

  async showCape(user: UserProfile, capeId: string) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    await this.mojangApi.showCape(capeId, token)
  }

  async verifySecurityLocation(user: UserProfile) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    return await this.mojangApi.verifySecurityLocation(token)
  }

  async getSecurityChallenges(user: UserProfile) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    return await this.mojangApi.getSecurityChallenges(token)
  }

  async submitSecurityChallenges(user: UserProfile, answers: MojangChallengeResponse[]) {
    const token = await this.userTokenStorage.get(user)
    if (!token) {
      throw new UserAuthenticationError()
    }
    return await this.mojangApi.submitSecurityChallenges(answers, token)
  }
}
