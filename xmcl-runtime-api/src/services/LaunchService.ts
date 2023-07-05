import { Exception } from '../entities/exception'
import { LaunchStatus } from '../entities/launch'
import { UserProfile } from '../entities/user.schema'
import { GenericEventEmitter } from '../events'
import { ServiceKey, StatefulService } from './Service'
import { UserExceptions } from './UserService'

export class LaunchState {
  status = 'idle' as LaunchStatus

  activeCount = 0

  launchCount(count: number) {
    if (count < 0) count = 0
    this.activeCount = count
  }

  launchStatus(status: LaunchStatus) {
    this.status = status
  }
}

interface LaunchServiceEventMap {
  'minecraft-window-ready': { pid?: number }
  'minecraft-start': {
    pid?: number
    version: string
    minecraft: string
    forge: string
    fabricLoader: string
  }
  'minecraft-exit': { pid?: number; code?: number; signal?: string; crashReport?: string; crashReportLocation?: string; errorLog: string }
  'minecraft-stdout': { pid?: number; stdout: string }
  'minecraft-stderr': { pid?: number; stdout: string }
  'error': LaunchException
}

export interface LaunchOptions {
  /**
   * Override selected version for current instance
   */
  version: string
  /**
   * The game directory of the minecraft
   */
  gameDirectory: string
  /**
   * The user to launch
   */
  user: UserProfile
  /**
   * The java exe path
   */
  java: string
  /**
   * Override the launch to server options
   */
  server?: {
    host: string
    port?: number
  }
  /**
   * Hide launcher after game started
   */
  hideLauncher?: boolean
  /**
   * Show log window after game started
   */
  showLog?: boolean
  /**
   * The launcher name
   */
  launcherName?: string
  /**
   * The launcher brand
   */
  launcherBrand?: string
  /**
   * The maximum memory to allocate
   */
  maxMemory?: number
  /**
   * The minimum memory to allocate
   */
  minMemory?: number
  /**
   * Skip assets check before launch
   */
  skipAssetsCheck?: boolean
  /**
   * The extra arguments for java vm
   */
  vmOptions?: string[]
  /**
   * The extra arguments for minecraft
   */
  mcOptions?: string[]
}

export interface LaunchService extends StatefulService<LaunchState>, GenericEventEmitter<LaunchServiceEventMap> {
  /**
   * Generate useable launch arguments for current profile
   */
  generateArguments(options: LaunchOptions): Promise<string[]>
  /**
   * Launch the current selected instance. This will return a boolean promise indicate whether launch is success.
   * @returns Does this launch request success?
   */
  launch(options: LaunchOptions): Promise<boolean>
}

export type LaunchExceptions = {
  type: 'launchNoVersionInstalled'
  /**
   * The override version in options
   */
  override?: string
  /**
   * The version in instance
   */
  version?: string
  minecraft: string
  forge?: string
  fabric?: string
} | {
  /**
   * Unknown error
   */
  type: 'launchGeneralException'
  error: unknown
} | {
  /**
   * Unknown java error. Might be empty java path
   */
  type: 'launchNoProperJava'
  javaPath: string
} | {
  /**
   * Java path is invalid
   */
  type: 'launchInvalidJavaPath'
  javaPath: string
} | {
  /**
   * No permission to use that java
   */
  type: 'launchJavaNoPermission'
  javaPath: string
} | {
  /**
   * Refresh user status failed
   */
  type: 'launchUserStatusRefreshFailed'
  userException: UserExceptions
}

export class LaunchException extends Exception<LaunchExceptions> { }

export const LaunchServiceKey: ServiceKey<LaunchService> = 'LaunchService'
