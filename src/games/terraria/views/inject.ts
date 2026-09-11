import { inject } from 'vue'
import type { TerrariaPlayerState } from '../parse'

export function useTeEditor() {
  const state = inject<() => TerrariaPlayerState>('savesmithState')
  const mutate = inject<(fn: (s: unknown) => unknown) => void>('savesmithMutate')
  if (!state || !mutate) throw new Error('TE_EDITOR_INJECT')
  return {
    get save() {
      return state()
    },
    markDirty(fn?: () => void) {
      mutate((s) => {
        fn?.()
        return s
      })
    }
  }
}
