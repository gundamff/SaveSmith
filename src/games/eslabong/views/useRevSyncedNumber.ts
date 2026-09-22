import { ref, watch, type Ref } from 'vue'
import type { EslabongState } from '../parse'
import type { useEsEditor } from './inject'

/**
 * Controlled InputNumber draft that survives markRaw + same-object mutate.
 * Local value updates immediately; session draft is written via markDirty.
 * Re-syncs from save whenever editor.rev bumps.
 */
export function useRevSyncedNumber(
  editor: ReturnType<typeof useEsEditor>,
  read: () => number,
  write: (s: EslabongState, n: number) => void,
  opts?: { min?: number; integer?: boolean }
): { value: Ref<number>; onUpdate: (v: number | undefined) => void } {
  const min = opts?.min ?? 0
  const integer = opts?.integer ?? true
  const value = ref(read())

  watch(
    () => editor.rev,
    () => {
      value.value = read()
    }
  )

  function onUpdate(v: number | undefined): void {
    if (v === undefined || Number.isNaN(v)) return
    let n = v
    if (integer) n = Math.floor(n)
    if (n < min) n = min
    value.value = n
    editor.markDirty((s) => write(s, n))
  }

  return { value, onUpdate }
}
