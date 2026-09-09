import { describe, expect, it } from 'vitest'
import {
  assertSerializeSane,
  changedFiles,
  expandWindowsTemplate,
  identifySaveDir
} from '@sdk/session'
import { ModuleError } from '@sdk/error'

describe('expandWindowsTemplate', () => {
  it('replaces USERPROFILE', () => {
    expect(
      expandWindowsTemplate('%USERPROFILE%\\AppData\\LocalLow\\X', { USERPROFILE: 'C:\\Users\\a' })
    ).toBe('C:\\Users\\a\\AppData\\LocalLow\\X')
  })
})

describe('identifySaveDir', () => {
  const loc = { windowsPathTemplates: [], identifyAnyOf: ['savedata0.cf', 'collection.cf'] }
  it('accepts when any identify file exists', () => {
    expect(identifySaveDir(loc, ['savedata0.cf', 'config.cf'])).toBe(true)
    expect(identifySaveDir(loc, ['config.cf'])).toBe(false)
  })
})

describe('changedFiles', () => {
  const enc = (s: string) => new TextEncoder().encode(s)
  it('returns only modified paths', () => {
    const orig = [{ relativePath: 'a.cf', bytes: enc('1') }, { relativePath: 'b.cf', bytes: enc('2') }]
    const next = [
      { relativePath: 'a.cf', bytes: enc('1') },
      { relativePath: 'b.cf', bytes: enc('3') }
    ]
    const c = changedFiles(orig, next)
    expect(c).toHaveLength(1)
    expect(c[0].relativePath).toBe('b.cf')
  })
})

describe('assertSerializeSane', () => {
  it('rejects empty list and empty bytes', () => {
    expect(() => assertSerializeSane([])).toThrow(ModuleError)
    expect(() => assertSerializeSane([{ relativePath: 'a', bytes: new Uint8Array() }])).toThrow(ModuleError)
  })
})
