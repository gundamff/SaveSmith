import { useSessionBindings } from '@host/editorBindings'
import type { BelmontsCurseState } from '../parse'

export function useBcEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('BC_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as BelmontsCurseState
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
