import { Instance, InstanceOptionsServiceKey } from '@xmcl/runtime-api'
import { Ref } from 'vue'
import { useService } from './service'
import { useState } from './syncableState'

export function useInstanceOptions(instance: Ref<Instance>) {
  const { editGameSetting, watch: watchOptions } = useService(InstanceOptionsServiceKey)
  const { state, isValidating, error } = useState(computed(() => `/instance-options/${instance.value.path}`), () => watchOptions(instance.value.path))

  watch(state, (newOps) => {
    if (newOps) {
      editGameSetting({
        instancePath: instance.value.path,
        ...newOps,
      })
    }
  }, { deep: true })

  return {
    gameOptions: state,
    isValidating,
    error,
  }
}
