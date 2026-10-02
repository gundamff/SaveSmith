import { useSessionBindings } from '@host/editorBindings'
import type { AceCombat8State } from '../parse'

export function useAc8Editor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('AC8_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as AceCombat8State
    },
    get rev(): number {
      return rev.value
    },
    markDirty(fn?: () => void) {
      mutate((s) => {
        fn?.()
        return s
      })
    }
  }
}
