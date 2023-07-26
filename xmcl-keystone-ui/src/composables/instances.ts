import { EditInstanceOptions, InstanceSchema, InstanceServiceKey, InstanceState } from '@xmcl/runtime-api'
import { InjectionKey, set } from 'vue'
import { useService } from './service'
import { useState } from './syncableState'
import { DeepPartial } from '@xmcl/runtime-api/src/util/object'

export const kInstances: InjectionKey<ReturnType<typeof useInstances>> = Symbol('Instances')

/**
 * Hook of a view of all instances & some deletion/selection functions
 */
export function useInstances() {
  const { createInstance, getSharedInstancesState, editInstance } = useService(InstanceServiceKey)
  const { state, isValidating, error } = useState(getSharedInstancesState, class extends InstanceState {
    override instanceEdit(settings: DeepPartial<InstanceSchema> & { path: string }) {
      const inst = this.instances.find(i => i.path === (settings.path))!
      if ('showLog' in settings) {
        set(inst, 'showLog', settings.showLog)
      }
      if ('hideLauncher' in settings) {
        set(inst, 'hideLauncher', settings.hideLauncher)
      }
      if ('fastLaunch' in settings) {
        set(inst, 'fastLaunch', settings.fastLaunch)
      }
      if ('maxMemory' in settings) {
        set(inst, 'maxMemory', settings.maxMemory)
      }
      if ('minMemory' in settings) {
        set(inst, 'minMemory', settings.minMemory)
      }
      if ('assignMemory' in settings) {
        set(inst, 'assignMemory', settings.assignMemory)
      }
      if ('vmOptions' in settings) {
        set(inst, 'vmOptions', settings.vmOptions)
      }
      if ('mcOptions' in settings) {
        set(inst, 'mcOptions', settings.mcOptions)
      }
    }
  })
  const instances = computed(() => state.value?.instances ?? [])
  async function edit(options: EditInstanceOptions & { instancePath: string }) {
    await editInstance(options)
  }
  watch(state, (newState) => {
    console.log(newState)
    if (!newState?.instances.length) {
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
