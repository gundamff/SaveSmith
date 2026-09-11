import { describe, expect, it } from 'vitest'
import { formatBackupSize, formatBackupTime } from '../src/host/backupFormat'

describe('backupFormat', () => {
  it('formats size in zh/en', () => {
    expect(formatBackupSize(400, 'zh')).toBe('400 字节')
    expect(formatBackupSize(400, 'en')).toBe('400 B')
    expect(formatBackupSize(2048, 'zh')).toBe('2.0 KB')
    expect(formatBackupSize(1024 * 1024, 'en')).toBe('1.0 MB')
  })

  it('formats mtime as local datetime string', () => {
    const text = formatBackupTime(Date.UTC(2026, 8, 10, 1, 55, 30), 'zh')
    expect(text).toMatch(/2026/)
    expect(text).not.toBe('—')
  })
})
