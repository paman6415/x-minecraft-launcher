import { MutableState } from '@xmcl/runtime-api'
import { Ref } from 'vue'

export type Handler<T> = { [k in keyof T]?: T[k] extends (...args: infer A) => infer R ? (state: T, ...args: A) => R : never }

export function useState<T extends object>(key: Ref<string>, fetcher: () => Promise<MutableState<T>>, handler?: Handler<T>) {
  const isValidating = ref(false)

  const state = ref<T | undefined>()
  let dispose = () => { }
  const error = ref(undefined as any)
  let abortController = new AbortController()
  const mutate = () => {
    const k = key.value
    if (!k) return
    isValidating.value = true
    abortController.abort()
    abortController = new AbortController()

    const { signal } = abortController

    dispose()
    // Avoid calling dispose multiple times
    dispose = () => { }
    fetcher().then((source) => {
      console.log(source)
      if (signal.aborted) { return }
      state.value = source
      source.onMutated = (mutation, defaultHandler) => {
        defaultHandler.call(state.value, mutation.payload);
        ((handler as any)?.[mutation.type] as any)?.(state.value, mutation.payload)
      }
      dispose = source.dispose
    }, (e) => {
      if (signal.aborted) { return }
      error.value = e
      if (import.meta.env.DEV) console.error(e)
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
