import { nextTick, onMounted, ref, watch, type Ref } from 'vue'

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 0)
      })
    })
  })
}

/**
 * Show a loading shell first, then mount heavy table DOM after the spinner can paint.
 * Call `reload()` (or pass trigger refs) when a filter/mode change needs the same treatment.
 */
export function useDeferredReady(triggers: Ref<unknown>[] = []) {
  const loading = ref(true)
  const ready = ref(false)
  let token = 0

  async function reload(): Promise<void> {
    const my = ++token
    loading.value = true
    ready.value = false
    await yieldToPaint()
    if (my !== token) return
    ready.value = true
    await nextTick()
    if (my !== token) return
    // One more frame so the heavy table can start mounting under the spinner.
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    if (my !== token) return
    loading.value = false
  }

  onMounted(() => {
    void reload()
  })

  for (const trigger of triggers) {
    watch(trigger, () => {
      void reload()
    })
  }

  return { loading, ready, reload }
}
