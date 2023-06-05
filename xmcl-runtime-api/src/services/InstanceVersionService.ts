/* eslint-disable @typescript-eslint/no-redeclare */
import { MinecraftJarIssue, ResolvedVersion, AssetIndexIssue, LibraryIssue, AssetIssue } from '@xmcl/core'
import { RuntimeVersions } from '../entities/instance.schema'
import { IssueKey } from '../entities/issue'
import { GenericEventEmitter } from '../events'
import { Exception } from '../entities/exception'
import { ServiceKey, StatefulService } from './Service'
import { InstallProfile, InstallProfileIssueReport } from '@xmcl/installer'
import { LocalVersionHeader } from './VersionService'

export class InstanceVersionState {
  version: ResolvedVersion | undefined
  versionHeader: LocalVersionHeader | undefined

  instanceVersion(version: ResolvedVersion | undefined) {
    this.version = version
  }

  instanceVersionHeader(version: LocalVersionHeader | undefined) {
    this.versionHeader = version
  }
}

export interface InstanceVersionService {
  diagnoseLibraries(currentVersion: ResolvedVersion): Promise<LibraryIssue[]>
  diagnoseAssetIndex(currentVersion: ResolvedVersion): Promise<AssetIndexIssue | undefined>
  diagnoseAssets(currentVersion: ResolvedVersion, strict?: boolean): Promise<AssetIssue[]>
  diagnoseJar(currentVersion: ResolvedVersion): Promise<MinecraftJarIssue | undefined>
  diagnoseProfile(version: string): Promise<InstallProfileIssueReport | undefined>
}

export const InstanceVersionServiceKey: ServiceKey<InstanceVersionService> = 'InstanceVersionService'

export type InstanceVersionExceptions = {
  /**
   * - fixVersionNoVersionMetadata -> no minecraft version metadata.
   * - fixVersionNoForgeVersionMetadata -> no forge version metadata.
   */
  type: 'fixVersionNoVersionMetadata' | 'fixVersionNoForgeVersionMetadata'
  minecraft: string
  forge?: string
}

export class InstanceVersionException extends Exception<InstanceVersionExceptions> { }
