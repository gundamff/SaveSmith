import { inject, type Ref } from 'vue'

/**
 * Session bindings for game editor tabs.
 *
 * ## Iron rules (markRaw save trees)
 *
 * 1. Save state is `markRaw`. In-place edits do not change object identity.
 * 2. Every `mutate`/`runAction` bumps `savesmithRev`. Call `trackRev()` / read
 *    `editor.rev` inside any computed that reads markRaw fields or lists.
 * 3. `el-table` / list rows for controlled InputNumber MUST be snapshots:
 *    new objects + primitive fields + stable `index`. Never pass markRaw
 *    entities as `row` (Element Plus reuses rows by reference → stale UI).
 * 4. `el-input-number` uses `@update:model-value` only (not `@change`).
 * 5. Each editor tab is a single root with `:data-ss-rev="editor.rev"`;
 *    keep `el-dialog` inside that root.
 */
export function useSessionBindings(label: string): {
  state: () => unknown
  mutate: (fn: (s: unknown) => unknown) => void
  rev: Ref<number>
  trackRev: () => void
} {
  const state = inject<() => unknown>('savesmithState')
  const mutate = inject<(fn: (s: unknown) => unknown) => void>('savesmithMutate')
  const rev = inject<Ref<number>>('savesmithRev')
  if (!state || !mutate || !rev) throw new Error(label)
  return {
    state,
    mutate,
    rev,
    trackRev() {
      void rev.value
    }
  }
}
