import { useService } from '@/composables/service'
import { Instance, InstanceData, InstanceServiceKey } from '@xmcl/runtime-api'
import { Ref, computed } from 'vue'
import { useLocalStorageCacheStringValue } from './cache'

export function useInstanceBase() {
  const { state } = useService(InstanceServiceKey)
  const path = computed(() => state.path)
  return { path }
}

export function useInstanceIsServer(i: Ref<Instance>) {
  return computed(() => i.value.server !== null)
}

/**
 * Use the general info of the instance
 */
export function useInstance() {
  const { state } = useService(InstanceServiceKey)

  const instance = computed(() => state.all[state.path])
  const path = useLocalStorageCacheStringValue('selectedInstancePath', state.instances[0].path)
  const select = (p: string) => {
    path.value = p
  }

  return {
    path,
    select,
    instance,
    refreshing: computed(() => false),
  }
}

/**
 * Hook of a view of all instances & some deletion/selection functions
 */
export function useInstances() {
  const { state } = useService(InstanceServiceKey)
  return {
    instances: computed(() => state.instances),
  }
}

export function useInstanceServerEdit(server: Ref<InstanceData['server']>) {
  const result = computed({
    get: () => server.value ?? { host: '', port: undefined },
    set: (v) => { server.value = v },
  })
  return result
}
