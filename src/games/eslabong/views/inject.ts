import type { EslabongState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useEsEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('ES_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as EslabongState
    },
    get rev(): number {
      return rev.value
    },
    /** Always mutate the draft `s` from session — do not close over a stale getter. */
    markDirty(fn?: (s: EslabongState) => void) {
      mutate((raw) => {
        const s = raw as EslabongState
        fn?.(s)
        return s
      })
    }
  }
}
