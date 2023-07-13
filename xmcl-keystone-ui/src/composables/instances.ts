import { EditInstanceOptions, InstanceServiceKey } from '@xmcl/runtime-api'
import { InjectionKey } from 'vue'
import { useService } from './service'
import { useState } from './syncableState'

export const kInstances: InjectionKey<ReturnType<typeof useInstances>> = Symbol('Instances')

/**
 * Hook of a view of all instances & some deletion/selection functions
 */
export function useInstances() {
  const { createInstance, getSharedInstancesState, editInstance } = useService(InstanceServiceKey)
  const { state, isValidating, error } = useState(ref('instances'), getSharedInstancesState)
  const instances = computed(() => state.value?.instances ?? [])
  async function edit(options: EditInstanceOptions & { instancePath: string }) {
    await editInstance(options)
  }
  watch(state, (newState) => {
    console.log(newState)
    if (!newState?.all.length) {
      const path = createInstance({
        name: 'Minecraft',
      })
    }
  })
  return {
    instances,
    isValidating,
    error,
    edit,
  }
}
