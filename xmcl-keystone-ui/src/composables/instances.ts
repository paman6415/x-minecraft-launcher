import { Instance, InstanceServiceKey } from '@xmcl/runtime-api'
import { InjectionKey, Ref } from 'vue'
import { useService } from './service'
import { useLocalStorageCache } from './cache'

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
  return {
    instances,

  }
}
