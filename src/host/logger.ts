import { logAppend } from './tauri'

export type LogLevel = 'info' | 'warn' | 'error'

/** Never throws: logging is best-effort and must not disrupt save/edit flows. */
export function logEvent(level: LogLevel, message: string): void {
  try {
    const pending = logAppend(level, message)
    void pending.catch(() => {
      /* logging failures are intentionally silent */
    })
  } catch {
    /* ignore environments without Tauri (unit tests, browser preview) */
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack?.trim() || `${error.name}: ${error.message}`
  }
  return String(error)
}

export function logError(message: string, error: unknown): void {
  logEvent('error', `${message}\n${describeError(error)}`)
}
