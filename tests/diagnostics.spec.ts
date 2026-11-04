import { describe, expect, it } from 'vitest'
import {
  formatClockTime,
  formatDiagnostics,
  formatErrorDetails,
  type DiagnosticsContext
} from '@host/diagnostics'

function makeContext(): DiagnosticsContext {
  return {
    generatedAt: Date.UTC(2026, 10, 4, 8, 9, 10),
    version: '0.17.5',
    os: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    language: 'zh-CN',
    appLocale: 'zh',
    gameId: 'phantom-blade-zero',
    gameName: '幻刃零',
    slot: 'pbz-main（ManualSave1）',
    saveDir: 'C:\\Users\\tester\\AppData\\Local\\PBZ\\Saved',
    files: [
      {
        name: 'PBZSaveGame.sav',
        size: 2048,
        modifiedMs: Date.UTC(2026, 0, 2, 3, 4, 5),
        isDir: false
      },
      {
        name: 'backup',
        size: 0,
        modifiedMs: Date.UTC(2026, 0, 2, 3, 4, 6),
        isDir: true
      }
    ],
    lastError: {
      message: '磁盘已满',
      stack: 'Error: 磁盘已满\n    at writeAtomic',
      at: Date.UTC(2026, 10, 4, 8, 8, 0)
    },
    logTail: ['[2026-11-04 08:08:00] [ERROR] write_atomic failed', 'plain line']
  }
}

describe('formatDiagnostics', () => {
  it('includes every requested diagnostic field', () => {
    const text = formatDiagnostics(makeContext(), 'zh')

    expect(text).toContain('0.17.5')
    expect(text).toContain('Windows NT 10.0; Win64; x64')
    expect(text).toContain('zh-CN')
    expect(text).toContain('phantom-blade-zero')
    expect(text).toContain('幻刃零')
    expect(text).toContain('pbz-main（ManualSave1）')
    expect(text).toContain('C:\\Users\\tester\\AppData\\Local\\PBZ\\Saved')
    expect(text).toContain('PBZSaveGame.sav')
    expect(text).toContain('2.0 KB')
    expect(text).toContain('<dir>')
    expect(text).toContain('2026-01-02 03:04:05 UTC')
    expect(text).toContain('磁盘已满')
    expect(text).toContain('write_atomic failed')
    expect(text).toContain('plain line')
  })

  it('covers the empty-state placeholders', () => {
    const text = formatDiagnostics(
      {
        ...makeContext(),
        gameId: null,
        gameName: null,
        slot: null,
        files: [],
        lastError: null,
        logTail: []
      },
      'en'
    )

    expect(text).toContain('none')
    expect(text).toContain('no recent error')
    expect(text).toContain('no log lines')
  })
})

describe('formatErrorDetails', () => {
  it('includes message, stack, time, version and save directory', () => {
    const text = formatErrorDetails(
      {
        message: 'disk full',
        stack: 'Error: disk full\n    at writeAtomic',
        at: Date.UTC(2026, 10, 4, 8, 9, 10),
        version: '0.17.5',
        saveDir: 'D:\\Saves'
      },
      'zh'
    )

    expect(text).toContain('disk full')
    expect(text).toContain('at writeAtomic')
    expect(text).toContain('2026-11-04 08:09:10 UTC')
    expect(text).toContain('0.17.5')
    expect(text).toContain('D:\\Saves')
  })
})

describe('formatClockTime', () => {
  it('formats a local HH:mm:ss clock without a date', () => {
    expect(formatClockTime(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('03:04:05')
    expect(formatClockTime(new Date(2026, 0, 2, 23, 59, 0).getTime())).toBe('23:59:00')
  })
})
