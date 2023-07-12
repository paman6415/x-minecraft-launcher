import { Instance } from '@xmcl/runtime-api'
import { InjectionKey, Ref, computed } from 'vue'
import { useLocalStorageCacheStringValue } from './cache'

export const kInstance: InjectionKey<ReturnType<typeof useInstance>> = Symbol('Instance')

/**
 * Use the general info of the instance
 */
export function useInstance(instances: Ref<Instance[]>) {
  const path = useLocalStorageCacheStringValue('selectedInstancePath', instances.value[0]?.path ?? '')
  const instance = computed(() => instances.value.find(i => i.path === path.value) ?? instances.value[0])
  const runtime = computed(() => instance.value.runtime)
  const name = computed(() => instance.value.name)
  const isServer = computed(() => instance.value.server !== null)
  const select = (p: string) => {
    path.value = p
  }

  return {
    instances,
    path,
    runtime,
    name,
    isServer,
    select,
    instance,
    refreshing: computed(() => false),
  }
}
