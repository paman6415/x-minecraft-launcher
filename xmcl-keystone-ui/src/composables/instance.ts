import { useService } from '@/composables/service'
import { Instance, InstanceServiceKey } from '@xmcl/runtime-api'
import { InjectionKey, Ref, computed } from 'vue'
import { useLocalStorageCache, useLocalStorageCacheStringValue } from './cache'

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
export const kInstances: InjectionKey<ReturnType<typeof useInstances>> = Symbol('Instances')

/**
 * Hook of a view of all instances & some deletion/selection functions
 */
export function useInstances() {
  const { getSharedInstancesState } = useService(InstanceServiceKey)
  const instances: Ref<Instance[]> = useLocalStorageCache('instances', () => [], JSON.stringify, JSON.parse)
  getSharedInstancesState().then(state => {
    // state.
  })
  function create() {

  }
  function edit() {

  }
  return {
    instances,
    edit,
    create,
  }
}
