import { useSessionBindings } from '@host/editorBindings'
import type { FinalFantasyResonanceState } from '../parse'

export function useFfrEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('FFR_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as FinalFantasyResonanceState
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
