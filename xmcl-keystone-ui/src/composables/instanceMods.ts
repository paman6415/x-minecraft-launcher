import { Instance, InstanceModsServiceKey, InstanceModsState, JavaRecord, Resource } from '@xmcl/runtime-api'
import { useService } from './service'
import { InjectionKey, Ref } from 'vue'
import { useState } from './syncableState'
import { ModDependencies, getModDependencies, getModProvides } from '@/util/modDependencies'

export interface InstanceMod {
  /**
   * Path on disk
   */
  path: string
  /**
   * The mod id
   */
  id: string
  /**
   * Mod display name
   */
  name: string
  /**
   * Mod version
   */
  version: string
  /**
   * The mod description text
   */
  description: string
  /**
   * Mod icon url
   */
  icon: string
  /**
   * Supported mod loaders
   */
  modLoaders: string[]
  /**
   * The resource tag
   */
  tags: string[]
  /**
   * The hash of the resource
   */
  hash: string
  /**
   * The universal location of the mod
   */
  url: string
  /**
   * All mod dependencies
   */
  dependencies: ModDependencies
  /**
   * The provided runtime
   */
  provideRuntime: Record<string, string>
  /**
   * If this mod is enabled. This is computed from the path suffix.
   */
  enabled: boolean
  /**
   * The backed resource
   */
  resource: Resource
}

export const kInstanceModsContext: InjectionKey<ReturnType<typeof useInstanceMods>> = Symbol('instance-mods')

export function useInstanceMods(instance: Ref<Instance>, java: Ref<JavaRecord | undefined>) {
  const { watch: watchMods } = useService(InstanceModsServiceKey)
  const { isValidating, error, state } = useState<InstanceModsState>(computed(() => `/instance-mods/${instance.value.path}`),
    () => watchMods(instance.value.path))

  const mods: Ref<InstanceMod[]> = shallowRef([])
  const modsIconsMap: Ref<Record<string, string>> = shallowRef({})
  const provideRuntime: Ref<Record<string, string>> = shallowRef({})

  const enabledModCounts = computed(() => mods.value.filter(v => v.enabled).length)

  watch(state, (s) => {
    if (s?.mods) {
      updateItems(s.mods)
    }
  })

  function updateItems(resources: Resource[]) {
    const newItems = resources.map(getModItemFromResource)
    const newIconMap: Record<string, string> = {}
    const runtime: Record<string, string> = {
      ...(instance.value.runtime as any),
      java: java.value?.version.toString() ?? '',
      fabricloader: instance.value.runtime.fabricLoader,
    }

    for (const item of newItems) {
      // Update icon map
      newIconMap[item.id] = item.icon
      if (item.enabled) {
        for (const [key, val] of Object.entries(item.provideRuntime)) {
          runtime[key] = val
        }
      }
    }

    modsIconsMap.value = newIconMap
    mods.value = newItems
    provideRuntime.value = runtime
  }

  function getUrl(resource: Resource) {
    return resource.uris.find(u => u?.startsWith('http')) ?? ''
  }

  function getModItemFromResource(resource: Resource): InstanceMod {
    const modItem: InstanceMod = ({
      path: resource.path,
      id: '',
      name: resource.path,
      version: '',
      modLoaders: markRaw([]),
      description: '',
      provideRuntime: markRaw(getModProvides(resource)),
      icon: resource.icons?.at(-1) ?? '',
      dependencies: markRaw(getModDependencies(resource)),
      url: getUrl(resource),
      hash: resource.hash,
      tags: resource.tags,
      enabled: !resource.path.endsWith('.disabled'),
      resource: markRaw(resource),
    })
    if (resource.metadata.forge) {
      modItem.modLoaders.push('forge')
    }
    if (resource.metadata.fabric) {
      modItem.modLoaders.push('fabric')
    }
    if (resource.metadata.liteloader) {
      modItem.modLoaders.push('liteloader')
    }
    if (resource.metadata.quilt) {
      modItem.modLoaders.push('quilt')
    }
    if (resource.metadata.forge) {
      const meta = resource.metadata.forge
      modItem.id = meta.modid
      modItem.name = meta.name
      modItem.version = meta.version
      modItem.description = meta.description
    } else if (resource.metadata.fabric) {
      const meta = resource.metadata.fabric instanceof Array ? resource.metadata.fabric[0] : resource.metadata.fabric
      modItem.id = meta.id
      modItem.version = meta.version
      modItem.name = meta.name ?? meta.id
      modItem.description = meta.description ?? ''
    } else if (resource.metadata.liteloader) {
      const meta = resource.metadata.liteloader
      modItem.name = meta.name
      modItem.version = meta.version ?? ''
      modItem.id = `${meta.name}`
      modItem.description = modItem.description ?? ''
    } else if (resource.metadata.quilt) {
      const meta = resource.metadata.quilt
      modItem.id = meta.quilt_loader.id
      modItem.version = meta.quilt_loader.version
      modItem.name = meta.quilt_loader.metadata?.name ?? meta.quilt_loader.id
      modItem.description = meta.quilt_loader.metadata?.description ?? ''
    } else {
      modItem.name = resource.fileName
    }
    if (!modItem.id) {
      modItem.id = resource.fileName + resource.hash.slice(0, 4)
    }
    if (!modItem.version) {
      modItem.version = '?'
    }
    if (!modItem.name) {
      modItem.name = resource.fileName
    }
    return markRaw(modItem)
  }

  return {
    mods,
    modsIconsMap,
    provideRuntime,
    enabledModCounts,
    isValidating,
    error,
  }
}
