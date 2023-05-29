import { injection } from '@/util/inject'
import { kStore } from '@/windows/main/store'
import { MutableState } from '@xmcl/runtime-api'
import { Ref } from 'vue'

export function useState<T extends object>(key: Ref<string>, fetcher: () => Promise<MutableState<T>>) {
  const isValidating = ref(false)

  const state = ref<T | undefined>()
  let dispose = () => { }
  const error = ref(undefined as any)
  const mutate = () => {
    isValidating.value = true
    dispose()
    fetcher().then((source) => {
      state.value = source
      source.onMutated = (mutation, defaultHandler) => {
        defaultHandler.call(state.value, mutation.payload)
      }
      dispose = source.dispose
    }, (e) => {
      error.value = e
    }).finally(() => {
      isValidating.value = false
    })
  }
  watch(key, mutate)
  onMounted(mutate)
  onUnmounted(dispose)
  return {
    isValidating,
    state,
    error,
  }
}
