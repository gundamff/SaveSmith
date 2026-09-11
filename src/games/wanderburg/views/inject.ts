import type { WanderburgState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useWbEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('WB_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as WanderburgState
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
