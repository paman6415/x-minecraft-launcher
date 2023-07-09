import { useService } from '@/composables/service'
import { Instance, InstanceData, InstanceServiceKey } from '@xmcl/runtime-api'
import { Ref, computed, InjectionKey, InjectionKey } from 'vue'
import { useLocalStorageCache, useLocalStorageCacheStringValue } from './cache'

export const kInstance: InjectionKey<ReturnType<typeof useInstance>> = Symbol('Instance')

/**
 * Use the general info of the instance
 */
export function useInstance() {
  const { state } = useService(InstanceServiceKey)
  const runtime = computed(() => instance.value.runtime)

  const path = useLocalStorageCacheStringValue('selectedInstancePath', state.instances[0].path)
  const instance = computed(() => state.all[path.value])
  const name = computed(() => instance.value.name)
  const isServer = computed(() => instance.value.server !== null)
  const instances = computed(() => state.instances)
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
