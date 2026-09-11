import type { DragonSwordState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useDsEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('DS_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as DragonSwordState
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
