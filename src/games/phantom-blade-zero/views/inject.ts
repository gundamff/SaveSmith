import { useSessionBindings } from '@host/editorBindings'
import type { PhantomBladeZeroState } from '../parse'

export function usePbzEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('PBZ_EDITOR_INJECT')
  return {
    get save(): PhantomBladeZeroState {
      trackRev()
      return state() as PhantomBladeZeroState
    },
    get rev(): number {
      return rev.value
    },
    markDirty(fn?: () => void) {
      mutate((current) => {
        fn?.()
        return current
      })
    }
  }
}
