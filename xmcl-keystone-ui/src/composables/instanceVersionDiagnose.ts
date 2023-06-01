import type { AssetIndexIssue, AssetIssue, LibraryIssue, MinecraftJarIssue, ResolvedVersion } from '@xmcl/core'
import type { InstallProfile } from '@xmcl/installer'
import { InstanceVersionServiceKey, IssueKey, RuntimeVersions, getExpectVersion } from '@xmcl/runtime-api'
import { Ref } from 'vue'
import { useService } from './service'

interface VersionIssue extends RuntimeVersions {
  version: string
}

interface VersionJarIssue extends RuntimeVersions, MinecraftJarIssue {
}

interface VersionJsonIssue extends RuntimeVersions {
  version: string
}

interface InstallProfileIssue {
  version: string
  minecraft: string
  installProfile: InstallProfile
}

export const VersionIssueKey: IssueKey<VersionIssue> = 'version'
export const VersionJsonIssueKey: IssueKey<VersionJsonIssue> = 'versionJson'
export const VersionJarIssueKey: IssueKey<VersionJarIssue> = 'versionJar'
export const AssetIndexIssueKey: IssueKey<AssetIndexIssue & RuntimeVersions> = 'assetIndex'
export const LibrariesIssueKey: IssueKey<{ version: string; libraries: LibraryIssue[] }> = 'library'
export const AssetsIssueKey: IssueKey<{ version: string; assets: AssetIssue[] }> = 'asset'
export const InstallProfileIssueKey: IssueKey<InstallProfileIssue> = 'badInstall'

export interface IssueItem {
  title: string
  description: string
  onClick?: () => void
}

export function useInstanceVersionDiagnose(runtime: Ref<RuntimeVersions>, resolvedVersion: Ref<ResolvedVersion | undefined>) {
  const { diagnoseAssetIndex, diagnoseAssets, diagnoseJar, diagnoseLibraries, diagnoseProfile } = useService(InstanceVersionServiceKey)
  const issueItems = ref([] as IssueItem[])
  const { t } = useI18n()

  async function update(version: ResolvedVersion | undefined) {
    if (!version) {
      issueItems.value = [{
        title: t('diagnosis.missingVersion.name', { version: getExpectVersion(runtime.value) }),
        description: t('diagnosis.missingVersion.message'),
      }]
      return
    }

    const jarIssue = await diagnoseJar(version)

    const items: IssueItem[] = []

    if (jarIssue) {
      const options = { version: jarIssue.version }
      const onClick = async () => {
        update(resolvedVersion.value)
      }
      items.push(jarIssue.type === 'corrupted'
        ? {
          title: t('diagnosis.corruptedVersionJar.name', options),
          description: t('diagnosis.corruptedVersionJar.message'),
          onClick,
        }
        : {
          title: t('diagnosis.missingVersionJar.name', options),
          description: t('diagnosis.missingVersionJar.message'),
          onClick,
        })
    }

    const assetIndexIssue = await diagnoseAssetIndex(version)

    if (assetIndexIssue) {
      items.push(assetIndexIssue.type === 'corrupted'
        ? {
          title: t('diagnosis.corruptedAssetsIndex.name', { version: assetIndexIssue.version }),
          description: t('diagnosis.corruptedAssetsIndex.message'),
        }
        : {
          title: t('diagnosis.missingAssetsIndex.name', { version: assetIndexIssue.version }),
          description: t('diagnosis.missingAssetsIndex.message'),
        })
    }

    const librariesIssue = await diagnoseLibraries(version)

    if (librariesIssue.length > 0) {
      const options = { named: { count: librariesIssue.length } }
      items.push(librariesIssue.some(v => v.type === 'corrupted')
        ? {
          title: t('diagnosis.corruptedLibraries.name', 2, options),
          description: t('diagnosis.corruptedLibraries.message'),
        }
        : {
          title: t('diagnosis.missingLibraries.name', 2, options),
          description: t('diagnosis.missingLibraries.message'),
        })
    }

    if (!assetIndexIssue) {
      const assetsIssue = await diagnoseAssets(version)
      if (assetsIssue.length > 0) {
        const options = { named: { count: assetsIssue.length } }
        items.push(assetsIssue.some(v => v.type === 'corrupted')
          ? {
            title: t('diagnosis.corruptedAssets.name', 2, options),
            description: t('diagnosis.corruptedAssets.message'),
          }
          : {
            title: t('diagnosis.missingAssets.name', 2, options),
            description: t('diagnosis.missingAssets.message'),
          },
        )
      }
    }

    const profileIssue = await diagnoseProfile(version.id)
    if (profileIssue) {
      items.push({
        title: t('diagnosis.badInstall.name', { version: version.id }),
        description: t('diagnosis.badInstall.message'),
      })
    }

    issueItems.value = items
  }

  watch(resolvedVersion, update)
  watch(runtime, () => update(resolvedVersion.value))
  onMounted(() => {
    update(resolvedVersion.value)
  })

  return {
    issues: issueItems,
  }
}
