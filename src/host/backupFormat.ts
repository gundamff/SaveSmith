/** Format backup mtime for UI (local timezone). */
export function formatBackupTime(mtimeMs: number, locale: string): string {
  if (!Number.isFinite(mtimeMs) || mtimeMs <= 0) return '—'
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(mtimeMs))
  } catch {
    return new Date(mtimeMs).toISOString()
  }
}

/** Human-readable file size. */
export function formatBackupSize(bytes: number, locale: 'zh' | 'en'): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) {
    return locale === 'en' ? `${bytes} B` : `${bytes} 字节`
  }
  const kib = bytes / 1024
  if (kib < 1024) {
    const n = kib < 10 ? kib.toFixed(1) : String(Math.round(kib))
    return `${n} KB`
  }
  const mib = kib / 1024
  const n = mib < 10 ? mib.toFixed(1) : String(Math.round(mib))
  return `${n} MB`
}
