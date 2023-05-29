
export type OnMutatedHandler = (mutation: { type: string; payload: any }, defaultHandler: (this: any, payload: any) => void) => void
/**
 * Generic representation of a mutable state
 */
export type MutableState<T> = T & {
  readonly id: string
  dispose(): void
  onMutated: OnMutatedHandler | undefined
}
