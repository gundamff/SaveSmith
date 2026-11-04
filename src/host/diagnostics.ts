export type DiagnosticLang = 'zh' | 'en'

export interface DiagnosticFileEntry {
  name: string
  size: number
  modifiedMs: number
  isDir: boolean
}

export interface DiagnosticError {
  message: string
  stack?: string | null
  at: number
}

export interface DiagnosticsContext {
  generatedAt: number
  version: string
  os: string
  language: string
  appLocale: string
  gameId: string | null
  gameName: string | null
  slot: string | null
  saveDir: string
  files: DiagnosticFileEntry[]
  filesError?: string | null
  lastError: DiagnosticError | null
  logTail: string[]
}

export interface ErrorDetailsContext {
  message: string
  stack?: string | null
  at: number
  version: string
  saveDir: string
}

interface Labels {
  title: string
  generatedAt: string
  version: string
  os: string
  language: string
  appLocale: string
  game: string
  slot: string
  saveDir: string
  files: string
  fileName: string
  size: string
  modifiedAt: string
  dirMarker: string
  lastError: string
  noError: string
  noLog: string
  noFiles: string
  logTail: string
  none: string
  errorTitle: string
  time: string
  message: string
  stack: string
  noStack: string
}

const LABELS: Record<DiagnosticLang, Labels> = {
  zh: {
    title: 'SaveSmith 诊断信息',
    generatedAt: '生成时间',
    version: 'SaveSmith 版本',
    os: '系统',
    language: '语言',
    appLocale: '界面语言',
    game: '游戏模块',
    slot: '当前槽位',
    saveDir: '存档目录',
    files: '存档目录文件',
    fileName: '文件名',
    size: '大小',
    modifiedAt: '修改时间',
    dirMarker: '<dir>',
    lastError: '最近一次错误',
    noError: '（无最近错误）',
    noLog: '（无日志）',
    noFiles: '（目录为空或无法读取）',
    logTail: '日志尾部 50 行',
    none: '（无）',
    errorTitle: 'SaveSmith 错误详情',
    time: '时间',
    message: '错误信息',
    stack: '堆栈',
    noStack: '（无堆栈）'
  },
  en: {
    title: 'SaveSmith diagnostics',
    generatedAt: 'Generated at',
    version: 'SaveSmith version',
    os: 'OS',
    language: 'Language',
    appLocale: 'UI language',
    game: 'Game module',
    slot: 'Current slot',
    saveDir: 'Save directory',
    files: 'Save directory entries',
    fileName: 'Name',
    size: 'Size',
    modifiedAt: 'Modified',
    dirMarker: '<dir>',
    lastError: 'Last error',
    noError: '(no recent error)',
    noLog: '(no log lines)',
    noFiles: '(directory empty or unreadable)',
    logTail: 'Log tail (last 50 lines)',
    none: '(none)',
    errorTitle: 'SaveSmith error details',
    time: 'Time',
    message: 'Message',
    stack: 'Stack',
    noStack: '(no stack trace)'
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** UTC timestamp used in copied diagnostics so the text is deterministic. */
export function formatDateTime(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '-'
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
  )
}

/** Local HH:mm:ss used by save toasts. */
export function formatClockTime(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '-'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatFileRow(file: DiagnosticFileEntry, labels: Labels): string {
  const size = file.isDir ? labels.dirMarker : formatBytes(file.size)
  return `  ${file.name}\t${size}\t${formatDateTime(file.modifiedMs)}`
}

export function formatDiagnostics(
  context: DiagnosticsContext,
  lang: DiagnosticLang = 'zh'
): string {
  const labels = LABELS[lang]
  const none = labels.none
  const game =
    context.gameId || context.gameName
      ? `${context.gameId ?? '-'}${context.gameName ? ` (${context.gameName})` : ''}`
      : none

  const lines: string[] = [
    labels.title,
    `${labels.generatedAt}: ${formatDateTime(context.generatedAt)}`,
    `${labels.version}: ${context.version || '-'}`,
    `${labels.os}: ${context.os || '-'}`,
    `${labels.language}: ${context.language || '-'}`,
    `${labels.appLocale}: ${context.appLocale || '-'}`,
    `${labels.game}: ${game}`,
    `${labels.slot}: ${context.slot || none}`,
    `${labels.saveDir}: ${context.saveDir || none}`,
    `${labels.files} (${context.files.length}):`,
    `  ${labels.fileName}\t${labels.size}\t${labels.modifiedAt}`
  ]

  if (context.files.length === 0) {
    lines.push(`  ${labels.noFiles}`)
  } else {
    for (const file of context.files) lines.push(formatFileRow(file, labels))
  }
  if (context.filesError) lines.push(`  ${context.filesError}`)

  lines.push('', `${labels.lastError}:`)
  if (context.lastError) {
    lines.push(
      `  ${formatDateTime(context.lastError.at)} ${context.lastError.message || '-'}`
    )
    const stack = context.lastError.stack?.trim()
    if (stack) {
      for (const line of stack.split(/\r?\n/)) lines.push(`  ${line}`)
    }
  } else {
    lines.push(`  ${labels.noError}`)
  }

  lines.push('', `${labels.logTail} (${context.logTail.length}):`)
  if (context.logTail.length === 0) {
    lines.push(`  ${labels.noLog}`)
  } else {
    for (const line of context.logTail) lines.push(line)
  }

  return lines.join('\n')
}

export function formatErrorDetails(
  context: ErrorDetailsContext,
  lang: DiagnosticLang = 'zh'
): string {
  const labels = LABELS[lang]
  const lines: string[] = [
    labels.errorTitle,
    `${labels.time}: ${formatDateTime(context.at)}`,
    `${labels.version}: ${context.version || '-'}`,
    `${labels.saveDir}: ${context.saveDir || '-'}`,
    `${labels.message}: ${context.message || '-'}`,
    `${labels.stack}:`
  ]

  const stack = context.stack?.trim()
  if (stack) {
    for (const line of stack.split(/\r?\n/)) lines.push(`  ${line}`)
  } else {
    lines.push(`  ${labels.noStack}`)
  }

  return lines.join('\n')
}
