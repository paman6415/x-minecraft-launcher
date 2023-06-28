import { useRefreshable, useService } from '@/composables'
import { getFTBPath } from '@/util/ftb'
import { injection } from '@/util/inject'
import { CachedFTBModpackVersionManifest, InstanceManifest, JavaServiceKey, ModpackInstallProfile, ModpackServiceKey, PeerServiceKey, RawModpackResource, Resource, RuntimeVersions } from '@xmcl/runtime-api'
import { DialogKey } from './dialog'
import { kModpacks } from './modpack'

export const AddInstanceDialogKey: DialogKey<string> = 'add-instance-dialog'

export interface Template extends ModpackInstallProfile {
  filePath: string
  name: string
  runtime: Required<RuntimeVersions>
  type: 'curseforge' | 'mcbbs' | 'modpack' | 'modrinth' | 'instance' | 'ftb' | 'peer'
}

export function useAllTemplate() {
  const { state: javaState } = useService(JavaServiceKey)
  const { state: peerState } = useService(PeerServiceKey)
  const { getModpackInstallProfile } = useService(ModpackServiceKey)

  const container = shallowRef([] as Array<Template>)
  const { resources } = injection(kModpacks)

  const getResourceInstallProfile = async (modpack: Resource): Promise<ModpackInstallProfile> => {
    if (modpack.metadata.instance) {
      return modpack.metadata.instance
    }

    return await getModpackInstallProfile(modpack.path)
  }

  const { refresh, refreshing } = useRefreshable(async () => {
    const all = [] as Array<Template>

    const profiles = await Promise.all(resources.value.map(getResourceInstallProfile))

    for (const [i, profile] of profiles.entries()) {
      const modpack = resources.value[i]
      const result: Template = {
        filePath: modpack.path,
        name: profile.instance.name,
        runtime: {
          minecraft: profile.instance.runtime.minecraft,
          forge: profile.instance.runtime.forge ?? '',
          fabricLoader: profile.instance.runtime.fabricLoader ?? '',
          quiltLoader: profile.instance.runtime.quiltLoader ?? '',
          optifine: profile.instance.runtime.optifine ?? '',
          liteloader: profile.instance.runtime.liteloader ?? '',
          yarn: profile.instance.runtime.yarn ?? '',
        },
        instance: profile.instance,
        files: profile.files,
        type: modpack.metadata['modrinth-modpack']
          ? 'modrinth'
          : modpack.metadata['curseforge-modpack']
            ? 'curseforge'
            : modpack.metadata['mcbbs-modpack'] ? 'mcbbs' : 'modpack',
      }
      all.push(result)
    }

    for (const c of peerState.connections) {
      if (c.sharing) {
        all.push(getPeerTemplate(c.id, c.userInfo.name, c.sharing))
      }
    }
    container.value = all
  })

  watch([resources, peerState], () => {
    refresh()
  })

  function getPeerTemplate(id: string, name: string, man: InstanceManifest) {
    const result: Template = {
      filePath: id,
      name: `${man.name ?? 'Instance'}@${name}`,
      runtime: {
        minecraft: man.runtime.minecraft,
        forge: man.runtime.forge ?? '',
        fabricLoader: man.runtime.fabricLoader ?? '',
        quiltLoader: man.runtime.quiltLoader ?? '',
        optifine: man.runtime.optifine ?? '',
        yarn: '',
        liteloader: '',
      },
      instance: {
        name: `${man.name ?? 'Instance'}@${name}`,
        description: man.description,
        runtime: {
          minecraft: man.runtime.minecraft,
          forge: man.runtime.forge ?? '',
          fabricLoader: man.runtime.fabricLoader ?? '',
          quiltLoader: man.runtime.quiltLoader ?? '',
          optifine: man.runtime.optifine ?? '',
          yarn: '',
          liteloader: '',
        },
        vmOptions: man.vmOptions,
        mcOptions: man.mcOptions,
        minMemory: man.minMemory,
        maxMemory: man.maxMemory,
      },
      files: man.files,
      type: 'peer',
      // source: { type: 'peer', id, manifest: man },
    }

    return result
  }

  function getFtbTemplate(man: CachedFTBModpackVersionManifest): Template {
    const getVersion = (str?: string) => {
      if (!str) { return undefined }
      const match = /(\d+)\.(\d)+\.(\d+)(_\d+)?/.exec(str)
      if (match === null) { return undefined }
      if (match[1] === '1') {
        return {
          version: str,
          majorVersion: Number.parseInt(match[2]),
          patch: Number.parseInt(match[4].substring(1)),
        }
      }
      return {
        version: str,
        majorVersion: Number.parseInt(match[1]),
        patch: Number.parseInt(match[3]),
      }
    }

    const getRuntime = () => {
      const javaRuntime = man.targets.find(v => v.name === 'java')
      if (javaRuntime) {
        const parsedVersion = getVersion(javaRuntime.version)
        if (!parsedVersion) {
          return
        }
        const majorMatched = javaState.all.filter(v => v.majorVersion === parsedVersion.majorVersion)
        let selectedRecord = majorMatched[0]
        for (const v of majorMatched.slice(1)) {
          const currentPatch = getVersion(v.version)?.patch
          const selectedPatch = getVersion(selectedRecord.version)?.patch
          if (!currentPatch || !selectedPatch) continue
          const diff = Math.abs(currentPatch - parsedVersion.patch)
          const selectedDiff = Math.abs(selectedPatch - parsedVersion.patch)
          if (diff < selectedDiff) {
            selectedRecord = v
          }
        }
        if (selectedRecord) {
          return selectedRecord.path
        }
      }
    }

    return {
      filePath: `${man.parent}-${man.id.toString()}`,
      name: '',
      runtime: {},
      instance: {
        name: `${man.projectName}-${man.name}`,
        author: man.authors[0].name,
        java: getRuntime() ?? '',
        runtime: {
          minecraft: man.targets.find(f => f.name === 'minecraft')?.version || '',
          forge: man.targets.find(f => f.name === 'forge')?.version || '',
          fabricLoader: '',
          quiltLoader: '',
          optifine: '',
          liteloader: '',
          yarn: '',
        },
        upstream: {
          type: 'ftb-modpack',
          id: man.id,
        },
        icon: man.iconUrl,
      },
      files: man.files.map(f => ({
        path: getFTBPath(f),
        hashes: {
          sha1: f.sha1,
        },
        curseforge: f.curseforge
          ? {
            projectId: f.curseforge.project,
            fileId: f.curseforge.file,
          }
          : undefined,
        downloads: f.url ? [f.url] : undefined,
        size: f.size,
      })),
      type: 'ftb',
    }
  }

  return {
    templates: container,
    refreshing,
  }
}
