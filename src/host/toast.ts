import { ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

export const TOAST_DURATION_MS = 3000

export const toasts = ref<ToastItem[]>([])

let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export function dismissToast(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

/** Adds a toast; multiple toasts stack and each disappears after 3s by default. */
export function pushToast(
  message: string,
  kind: ToastKind = 'info',
  durationMs = TOAST_DURATION_MS
): number {
  const id = nextId++
  toasts.value = [...toasts.value, { id, message, kind }]
  const timer = setTimeout(() => dismissToast(id), durationMs)
  timers.set(id, timer)
  return id
}
