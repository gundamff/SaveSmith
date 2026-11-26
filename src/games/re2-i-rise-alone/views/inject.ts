import type { Re2IraState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useRe2IraEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('R2IRA_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as Re2IraState
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