import { inject } from 'vue'
import type { WanderburgState } from '../parse'

export function useWbEditor() {
  const state = inject<() => WanderburgState>('savesmithState')
  const mutate = inject<(fn: (s: unknown) => unknown) => void>('savesmithMutate')
  if (!state || !mutate) throw new Error('WB_EDITOR_INJECT')
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
