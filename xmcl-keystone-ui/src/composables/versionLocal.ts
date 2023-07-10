import { useService } from '@/composables'
import { VersionServiceKey } from '@xmcl/runtime-api'
import { computed, InjectionKey } from 'vue'
import { useState } from './syncableState'

export const kLocalVersions: InjectionKey<ReturnType<typeof useLocalVersions>> = Symbol('LocalVersions')

export function useLocalVersions() {
  const { getLocalVersions } = useService(VersionServiceKey)
  const { state, isValidating, error } = useState(ref('localVersions'), getLocalVersions)
  const versions = computed(() => state.value?.local ?? [])

  return {
    versions,
    isValidating,
    error,
  }
}
