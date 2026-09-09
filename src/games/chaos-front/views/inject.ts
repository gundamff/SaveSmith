import { inject } from 'vue'
import type { ChaosFrontState } from '../parse'

export function useCfEditor() {
  const state = inject<() => ChaosFrontState>('savesmithState')
  const mutate = inject<(fn: (s: unknown) => unknown) => void>('savesmithMutate')
  if (!state || !mutate) throw new Error('CF_EDITOR_INJECT')
  return {
    get save() {
      return state().campaign
    },
    get collection() {
      return state().collection
    },
    markDirty(fn?: () => void) {
      mutate((s) => {
        fn?.()
        return s
      })
    }
  }
}
