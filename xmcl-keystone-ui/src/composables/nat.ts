import { NatServiceKey } from '@xmcl/runtime-api'
import { useService } from './service'
import { useState } from './syncableState'
import { set } from 'vue'

export function useNatState() {
  const { getNatState } = useService(NatServiceKey)
  const { state, isValidating, error } = useState(ref('nat'), getNatState, {
    natAddressSet(state, address): void {
      set(state, 'natAddress', address)
    },
    natDeviceSet(state, device): void {
      set(state, 'natDevice', device)
    },
  })
  const natType = computed(() => state.value?.natType ?? 'Unknown')
  const externalIp = computed(() => state.value?.externalIp ?? '')
  const externalPort = computed(() => state.value?.externalPort ?? 0)
  const localIp = computed(() => state.value?.localIp ?? '')
  const natDevice = computed(() => state.value?.natDevice ?? undefined)
  return {
    natType,
    externalIp,
    externalPort,
    localIp,
    natDevice,
    isValidating,
    error,
  }
}
