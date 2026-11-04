import { copyText } from './clipboard'
import {
  formatDiagnostics,
  type DiagnosticFileEntry,
  type DiagnosticsContext
} from './diagnostics'
import { locale } from './i18n'
import { currentSlotLabel } from './sessionContext'
import { useSessionStore } from './stores/session'
import { listDirEntries, logTail } from './tauri'
import { getAppVersion } from './version'

/** Builds the copyable diagnostics report from the current app/session state. */
export async function buildDiagnosticsReport(): Promise<string> {
  const store = useSessionStore()
  const lang = locale.value
  const version = await getAppVersion()

  let files: DiagnosticFileEntry[] = []
  let filesError: string | null = null
  if (store.saveDir) {
    try {
      files = await listDirEntries(store.saveDir)
    } catch (error) {
      filesError = error instanceof Error ? error.message : String(error)
    }
  }

  let logs: string[] = []
  try {
    logs = await logTail(50)
  } catch {
    logs = []
  }

  const game = store.game
  const gameName = game ? game.catalog.name[lang] ?? game.catalog.name.zh : null
  const slotLabel = currentSlotLabel(store.slots, store.currentSlotId)
  const slot =
    store.currentSlotId && slotLabel && slotLabel !== store.currentSlotId
      ? `${store.currentSlotId} (${slotLabel})`
      : store.currentSlotId

  const context: DiagnosticsContext = {
    generatedAt: Date.now(),
    version: version || 'unknown',
    os: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    appLocale: lang,
    gameId: game?.id ?? null,
    gameName,
    slot,
    saveDir: store.saveDir,
    files,
    filesError,
    lastError: store.lastError,
    logTail: logs
  }

  return formatDiagnostics(context, lang)
}

/** Copies the diagnostics report; returns false when clipboard access fails. */
export async function copyDiagnostics(): Promise<boolean> {
  const text = await buildDiagnosticsReport()
  return copyText(text)
}
