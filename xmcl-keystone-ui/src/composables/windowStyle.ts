import { BaseServiceKey, Environment } from '@xmcl/runtime-api'
import { useService } from './service'
import { Ref } from 'vue'
import { injection } from '@/util/inject'
import { kSettingsState } from './setting'

export function useWindowStyle() {
  const { getEnvironment } = useService(BaseServiceKey)
  const { state } = injection(kSettingsState)
  const maximized = ref(false)
  windowController.on('maximize', (v) => {
    maximized.value = v
  })
  windowController.on('minimize', (v) => {
    maximized.value = v
  })
  const env: Ref<Environment | undefined> = ref(undefined)
  getEnvironment().then(v => {
    env.value = v
  })
  const hideWindowControl = computed(() => env.value?.os === 'osx' || (env.value?.os === 'linux' && state.value?.linuxTitlebar))
  const shouldShiftBackControl = computed(() => env.value?.os === 'osx')
  return {
    shouldShiftBackControl,
    hideWindowControl,
  }
}
