import type { ChaosFrontState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useCfEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('CF_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return (state() as ChaosFrontState).campaign
    },
    get collection() {
      trackRev()
      return (state() as ChaosFrontState).collection
    },
    /** Session edit generation — depend on this in list/table computeds. */
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
