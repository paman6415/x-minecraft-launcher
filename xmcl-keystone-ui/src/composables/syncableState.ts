import { MutableState } from '@xmcl/runtime-api'
import { Ref } from 'vue'

export function useState<T extends object>(key: Ref<string>, fetcher: () => Promise<MutableState<T>>) {
  const isValidating = ref(false)

  const state = ref<T | undefined>()
  let dispose = () => { }
  const error = ref(undefined as any)
  let abortController = new AbortController()
  const mutate = () => {
    isValidating.value = true
    abortController.abort()
    abortController = new AbortController()

    const { signal } = abortController

    dispose()
    // Avoid calling dispose multiple times
    dispose = () => { }
    fetcher().then((source) => {
      if (signal.aborted) { return }
      state.value = source
      source.onMutated = (mutation, defaultHandler) => {
        defaultHandler.call(state.value, mutation.payload)
      }
      dispose = source.dispose
    }, (e) => {
      if (signal.aborted) { return }
      error.value = e
    }).finally(() => {
      if (signal.aborted) { return }
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
