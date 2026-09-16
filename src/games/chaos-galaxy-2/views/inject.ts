import type { ChaosGalaxy2State } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useCg2Editor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('CG2_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return (state() as ChaosGalaxy2State).campaign
    },
    get config() {
      trackRev()
      return (state() as ChaosGalaxy2State).config
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
