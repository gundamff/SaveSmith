import type { TerrariaPlayerState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useTeEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('TE_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as TerrariaPlayerState
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
