import type { BallXPitState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useBxpEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('BXP_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as BallXPitState
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
