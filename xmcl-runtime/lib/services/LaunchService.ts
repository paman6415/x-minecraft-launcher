import { createMinecraftProcessWatcher, diagnoseJar, diagnoseLibraries, launch, LaunchOption, LaunchPrecheck, MinecraftFolder, ResolvedVersion, Version } from '@xmcl/core'
import { LaunchService as ILaunchService, LaunchException, LaunchOptions, LaunchServiceKey, LaunchState } from '@xmcl/runtime-api'
import { ChildProcess } from 'child_process'
import { EOL } from 'os'
import LauncherApp from '../app/LauncherApp'
import { LauncherAppKey } from '../app/utils'
import { EncodingWorker, kEncodingWorker } from '../entities/encodingWorker'
import { JavaValidation } from '../entities/java'
import { kUserTokenStorage, UserTokenStorage } from '../entities/userTokenStore'
import { UTF8 } from '../util/encoding'
import { Inject } from '../util/objectRegistry'
import { ExternalAuthSkinService } from './ExternalAuthSkinService'
import { InstallService } from './InstallService'
import { InstanceResourcePackService } from './InstanceResourcePacksService'
import { InstanceService } from './InstanceService'
import { InstanceShaderPacksService } from './InstanceShaderPacksService'
import { JavaService } from './JavaService'
import { ExposeServiceKey, StatefulService } from './Service'
import { UserService } from './UserService'

export interface LaunchPlugin {

}

@ExposeServiceKey(LaunchServiceKey)
export class LaunchService extends StatefulService<LaunchState> implements ILaunchService {
  private launchedProcesses: ChildProcess[] = []

  constructor(@Inject(LauncherAppKey) app: LauncherApp,
    @Inject(ExternalAuthSkinService) private externalAuthSkinService: ExternalAuthSkinService,
    @Inject(InstanceService) private instanceService: InstanceService,
    @Inject(InstallService) private installService: InstallService,
    @Inject(InstanceResourcePackService) private instanceResourcePackService: InstanceResourcePackService,
    @Inject(InstanceShaderPacksService) private instanceShaderPacksService: InstanceShaderPacksService,
    @Inject(JavaService) private javaService: JavaService,
    @Inject(kUserTokenStorage) private userTokenStorage: UserTokenStorage,
    @Inject(kEncodingWorker) private encoder: EncodingWorker,
    @Inject(UserService) private userService: UserService,
  ) {
    super(app, () => new LaunchState())
  }

  register() {}

  async generateArguments() {
    return []
  }

  async kill() {
    if (this.launchedProcesses.length > 0) {
      const last = this.launchedProcesses.pop()
      last!.kill()
    }
  }

  /**
   * Launch the current selected instance. This will return a boolean promise indeicate whether launch is success.
   * @returns Does this launch request success?
   */
  async launch(options: LaunchOptions) {
    try {
      if (this.state.status !== 'idle') {
        return false
      }

      this.state.launchStatus('checkingProblems')

      const user = options.user
      const gameProfile = user.profiles[user.selectedProfile]
      const javaPath = options.java

      if (!options?.ignoreUserStatus) {
        try {
          await this.userService.refreshUser()
        } catch (e) {
          this.warn(`Fail to determine user status to launch: ${e}`)
        }
      }

      // if (!options?.skipAssetsCheck) {
      //   await this.semaphoreManager.wait('diagnose')
      //   const issues = this.diagnoseService.state.issues
      //   for (let problems = issues.filter(p => p.autoFix && p.parameters.length > 0), i = 0;
      //     problems.length !== 0 && i <= 2;
      //     problems = issues.filter(p => p.autoFix && p.parameters.length > 0), i += 1) {
      //     await this.diagnoseService.fix(problems)
      //   }
      // }

      // await this.instanceResourcePackService.ensureResourcePacks().catch((e) => this.error(e))
      await this.instanceShaderPacksService.ensureShaderPacks().catch((e) => this.error(e))

      if (this.state.status === 'idle') { // check if we have cancel (set to ready) this launch
        return false
      }

      const yggdrasilHost = user
        ? this.userService.getAccountSystem(user?.authService)?.getYggdrasilAuthHost?.(user?.authService) ??
        this.userService.yggdrasilAccountSystem.getYggdrasilAuthHost(user?.authService)
        : undefined
      let yggdrasilAgent: LaunchOption['yggdrasilAgent']

      if (yggdrasilHost) {
        this.state.launchStatus('injectingAuthLib')
        try {
          const jar = await this.externalAuthSkinService.installAuthLibInjection()
          yggdrasilAgent = {
            jar,
            server: yggdrasilHost,
          }
        } catch (e) {
          this.error(new Error('Fail to install authlib-injection', { cause: e }))
        }
      }

      const minecraftFolder = new MinecraftFolder(options.gameDirectory)

      let version: ResolvedVersion | undefined

      if (options.version) {
        this.log(`Override the version: ${options.version}`)
        try {
          version = await Version.parse(this.getPath(), options.version)
        } catch (e) {
          this.warn(`Cannot use override version: ${options.version}`)
          this.warn(e)
        }
      }

      if (!version) {
        throw new LaunchException({
          type: 'launchNoVersionInstalled',
          override: options?.version,
          minecraft: '',
          // minecraft: instance.runtime.minecraft,
          // forge: instance.runtime.forge,
          // fabric: instance.runtime.fabricLoader,
        })
      }

      if (!options?.skipAssetsCheck) {
        const resolvedVersion = version
        const resourceFolder = new MinecraftFolder(this.getPath())
        await Promise.all([
          diagnoseJar(resolvedVersion, resourceFolder).then((issue) => {
            if (issue) {
              return this.installService.installMinecraftJar(resolvedVersion)
            }
          }),
          diagnoseLibraries(version, resourceFolder).then(async (libs) => {
            if (libs.length > 0) {
              await this.installService.installLibraries(libs.map(l => l.library))
            }
          }),
        ])
      }

      this.state.launchStatus('launching')

      this.log(`Will launch with ${version.id} version.`)

      if (!javaPath) {
        throw new LaunchException({ type: 'launchNoProperJava', javaPath: javaPath || '' }, 'Cannot launch without a valid java')
      }
      // const assignMemory = instance.assignMemory ?? globalState.globalAssignMemory
      // let minMemory: number | undefined = instance.minMemory ?? globalState.globalMinMemory
      // let maxMemory: number | undefined = instance.maxMemory ?? globalState.globalMaxMemory

      // minMemory = assignMemory === true && minMemory > 0
      //   ? minMemory
      //   : assignMemory === 'auto' ? Math.floor((await this.baseService.getMemoryStatus()).free / 1024 / 1024 - 256) : undefined
      // maxMemory = assignMemory === true && maxMemory > 0 ? maxMemory : undefined
      const minMemory: number | undefined = options.maxMemory
      const maxMemory: number | undefined = options.minMemory
      const prechecks = [LaunchPrecheck.checkNatives, LaunchPrecheck.linkAssets]
      const accessToken = user ? await this.userTokenStorage.get(user).catch(() => undefined) : undefined

      /**
       * Build launch condition
       */
      const launchOptions: LaunchOption = {
        gameProfile,
        accessToken,
        properties: {},
        gamePath: minecraftFolder.root,
        resourcePath: this.getPath(),
        javaPath,
        minMemory,
        maxMemory,
        version,
        extraExecOption: {
          detached: true,
          cwd: minecraftFolder.root,
        },
        extraJVMArgs: options.vmOptions?.filter(v => !!v),
        extraMCArgs: options.mcOptions?.filter(v => !!v),
        launcherBrand: options?.launcherBrand ?? '',
        launcherName: options?.launcherName ?? 'XMCL',
        yggdrasilAgent,
        prechecks,
      }

      if (options.server) {
        this.log('Launching a server')
        launchOptions.server = {
          ip: options.server.host,
          port: options.server?.port,
        }
      }

      this.log('Launching with these option...')
      this.log(JSON.stringify(launchOptions, (k, v) => (k === 'accessToken' ? '***' : v), 2))

      try {
        const result = await this.javaService.validateJavaPath(javaPath)
        if (result === JavaValidation.NotExisted) {
          throw new LaunchException({ type: 'launchInvalidJavaPath', javaPath })
        }
        if (result === JavaValidation.NoPermission) {
          throw new LaunchException({ type: 'launchJavaNoPermission', javaPath })
        }
      } catch (e) {
        throw new LaunchException({ type: 'launchNoProperJava', javaPath }, 'Cannot launch without a valid java')
      }

      // Launch
      const process = await launch(launchOptions)
      this.launchedProcesses.push(process)
      process.on('spawn', () => {
        this.state.launchCount(this.state.activeCount + 1)
      }).on('close', () => {
        this.state.launchCount(this.state.activeCount - 1)
      })

      this.emit('minecraft-start', {
        pid: process.pid,
        version: version.id,
        minecraft: version.minecraftVersion,
        // forge: instance.runtime.forge ?? '',
        // fabricLoader: instance.runtime.fabricLoader ?? '',
      })
      const watcher = createMinecraftProcessWatcher(process)
      const errorLogs = [] as string[]
      const startTime = Date.now()

      // TODO: move this to plugin system
      this.instanceService.editInstance({
        instancePath: options.gameDirectory,
        lastPlayedDate: startTime,
      })

      const processError = async (buf: Buffer) => {
        const encoding = await this.encoder.guessEncodingByBuffer(buf).catch(e => { })
        const result = await this.encoder.decode(buf, encoding || UTF8)
        this.emit('minecraft-stderr', { pid: process.pid, stderr: result })
        const lines = result.split(EOL)
        errorLogs.push(...lines)
        this.warn(result)
      }
      const processLog = async (buf: any) => {
        const encoding = await this.encoder.guessEncodingByBuffer(buf).catch(e => undefined)
        const result = await this.encoder.decode(buf, encoding || UTF8)
        this.emit('minecraft-stdout', { pid: process.pid, stdout: result })
      }

      const errPromises = [] as Promise<any>[]
      process.stderr?.on('data', async (buf: any) => {
        errPromises.push(processError(buf))
      })
      process.stdout?.on('data', (s) => {
        processLog(s).catch(this.error)
      })

      watcher.on('error', (err) => {
        this.emit('error', new LaunchException({ type: 'launchGeneralException', error: err }))
      }).on('minecraft-exit', ({ code, signal, crashReport, crashReportLocation }) => {
        const endTime = Date.now()
        const playTime = endTime - startTime

        // TODO: move this to plugin system
        this.instanceService.editInstance({
          instancePath: options.gameDirectory,
          // playtime: instance.playtime + playTime,
        })

        this.log(`Minecraft exit: ${code}, signal: ${signal}`)
        if (crashReportLocation) {
          crashReportLocation = crashReportLocation.substring(0, crashReportLocation.lastIndexOf('.txt') + 4)
        }
        Promise.all(errPromises).catch((e) => { this.error(e) }).finally(() => {
          this.emit('minecraft-exit', {
            pid: process.pid,
            code,
            signal,
            crashReport,
            crashReportLocation: crashReportLocation ? crashReportLocation.replace('\r\n', '').trim() : '',
            errorLog: errorLogs.join('\n'),
          })
        })
        this.launchedProcesses = this.launchedProcesses.filter(p => p !== process)
      }).on('minecraft-window-ready', () => {
        this.emit('minecraft-window-ready', { pid: process.pid })
      })
      process.unref()
      this.state.launchStatus('idle')

      return true
    } catch (e) {
      this.state.launchStatus('idle')

      if (e instanceof LaunchException) {
        throw e
      }
      throw new LaunchException({ type: 'launchGeneralException', error: { ...(e as any), message: (e as any).message, stack: (e as any).stack } })
    }
  }
}
