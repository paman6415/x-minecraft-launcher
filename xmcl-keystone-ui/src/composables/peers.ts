import { PeerServiceKey } from '@xmcl/runtime-api'
import { useService } from './service'
import { useState } from './syncableState'

import { InjectionKey } from 'vue'

export const kPeerState: InjectionKey<ReturnType<typeof usePeerState>> = Symbol('PeerState')

export function usePeerState() {
  const { getPeerState } = useService(PeerServiceKey)
  const { state } = useState(ref('peer'), getPeerState)
  const connections = computed(() => state.value?.connections || [])
  const group = computed(() => state.value?.group ?? '')

  return {
    connections,
    group,
  }
}
