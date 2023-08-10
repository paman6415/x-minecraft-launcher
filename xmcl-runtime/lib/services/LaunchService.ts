import { createMinecraftProcessWatcher, diagnoseJar, diagnoseLibraries, launch, LaunchOption, LaunchPrecheck, MinecraftFolder, ResolvedVersion, Version } from '@xmcl/core'
import { LaunchService as ILaunchService, LaunchException, LaunchOptions, LaunchServiceKey } from '@xmcl/runtime-api'
import { ChildProcess } from 'child_process'
import { EOL } from 'os'
import LauncherApp from '../app/LauncherApp'
import { LauncherAppKey } from '../app/utils'
import { EncodingWorker, kEncodingWorker } from '../entities/encodingWorker'
import { JavaValidation } from '../entities/java'
import { kUserTokenStorage, UserTokenStorage } from '../entities/userTokenStore'
import { UTF8 } from '../util/encoding'
import { Inject } from '../util/objectRegistry'
import { InstallService } from './InstallService'
import { JavaService } from './JavaService'
import { AbstractService, ExposeServiceKey } from './Service'

export interface LaunchPlugin {

}

@ExposeServiceKey(LaunchServiceKey)
export class LaunchService extends AbstractService implements ILaunchService {
  private launchedProcesses: ChildProcess[] = []

  constructor(@Inject(LauncherAppKey) app: LauncherApp,
    @Inject(InstallService) private installService: InstallService,
    @Inject(JavaService) private javaService: JavaService,
    @Inject(kUserTokenStorage) private userTokenStorage: UserTokenStorage,
    @Inject(kEncodingWorker) private encoder: EncodingWorker,
  ) {
    super(app)
  }

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
      const user = options.user
      const gameProfile = user.profiles[user.selectedProfile]
      const javaPath = options.java
      const yggdrasilAgent = options.yggdrasilAgent

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

      this.log(`Will launch with ${version.id} version.`)

      if (!javaPath) {
        throw new LaunchException({ type: 'launchNoProperJava', javaPath: javaPath || '' }, 'Cannot launch without a valid java')
      }
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

      this.emit('minecraft-start', {
        pid: process.pid,
        minecraft: version.minecraftVersion,
        ...options,
      })
      const watcher = createMinecraftProcessWatcher(process)
      const errorLogs = [] as string[]
      const startTime = Date.now()

      // TODO: move this to plugin system
      // this.instanceService.editInstance({
      //   instancePath: options.gameDirectory,
      //   lastPlayedDate: startTime,
      // })

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
        // this.instanceService.editInstance({
        //   instancePath: options.gameDirectory,
        //   // playtime: instance.playtime + playTime,
        // })

        this.log(`Minecraft exit: ${code}, signal: ${signal}`)
        if (crashReportLocation) {
          crashReportLocation = crashReportLocation.substring(0, crashReportLocation.lastIndexOf('.txt') + 4)
        }
        Promise.all(errPromises).catch((e) => { this.error(e) }).finally(() => {
          this.emit('minecraft-exit', {
            pid: process.pid,
            ...options,
            code,
            signal,
            crashReport,
            duration: playTime,
            crashReportLocation: crashReportLocation ? crashReportLocation.replace('\r\n', '').trim() : '',
            errorLog: errorLogs.join('\n'),
          })
        })
        this.launchedProcesses = this.launchedProcesses.filter(p => p !== process)
      }).on('minecraft-window-ready', () => {
        this.emit('minecraft-window-ready', { pid: process.pid, ...options })
      })
      process.unref()

      return true
    } catch (e) {
      if (e instanceof LaunchException) {
        throw e
      }
      throw new LaunchException({ type: 'launchGeneralException', error: { ...(e as any), message: (e as any).message, stack: (e as any).stack } })
    }
  }
}
