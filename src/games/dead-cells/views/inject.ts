import type { DeadCellsState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useDcEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('DC_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as DeadCellsState
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
