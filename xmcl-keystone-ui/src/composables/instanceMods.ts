import { Mod, getModItemFromResource } from '@/util/mod'
import { Instance, InstanceModsServiceKey, InstanceModsState, JavaRecord, Resource } from '@xmcl/runtime-api'
import { InjectionKey, Ref } from 'vue'
import { useService } from './service'
import { useState } from './syncableState'

export const kInstanceModsContext: InjectionKey<ReturnType<typeof useInstanceMods>> = Symbol('instance-mods')

export function useInstanceMods(instance: Ref<Instance>, java: Ref<JavaRecord | undefined>) {
  const { watch: watchMods } = useService(InstanceModsServiceKey)
  const { isValidating, error, state } = useState(() => instance.value.path ? watchMods(instance.value.path) : undefined, InstanceModsState)

  const mods: Ref<Mod[]> = shallowRef([])
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

  return {
    mods,
    modsIconsMap,
    provideRuntime,
    enabledModCounts,
    isValidating,
    error,
  }
}
