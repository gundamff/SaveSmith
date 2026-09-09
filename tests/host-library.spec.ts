import { describe, expect, it, vi } from 'vitest'
import { dummyModule } from './dummyModule'
import { confirmSaveDir, probeModuleSaveDir } from '@host/probe'
import { modules } from '@host/registry'

describe('registry', () => {
  it('registers compiled game modules in registry order', () => {
    expect(Array.isArray(modules)).toBe(true)
    expect(modules).toHaveLength(2)
    expect(modules.map((m) => m.id)).toEqual(['chaos-front', 'wanderburg'])
  })
})

describe('probeModuleSaveDir', () => {
  const locator = {
    windowsPathTemplates: [
      '%USERPROFILE%\\Games\\Dummy',
      '%USERPROFILE%\\Alt\\Dummy'
    ],
    identifyAnyOf: ['save.txt']
  }

  it('returns the first expanded path that identifies as a save dir', async () => {
    const listDirNames = vi.fn(async (dir: string) => {
      if (dir.endsWith('Alt\\Dummy')) return ['save.txt']
      return ['readme.txt']
    })
    await expect(
      probeModuleSaveDir(locator, { USERPROFILE: 'C:\\Users\\a' }, listDirNames)
    ).resolves.toBe('C:\\Users\\a\\Alt\\Dummy')
  })

  it('returns null and does not throw when listing fails', async () => {
    const listDirNames = vi.fn(async () => {
      throw new Error('ENOENT')
    })
    await expect(
      probeModuleSaveDir(locator, { USERPROFILE: 'C:\\Users\\a' }, listDirNames)
    ).resolves.toBeNull()
  })

  it('returns null when no template matches', async () => {
    const listDirNames = vi.fn(async () => ['other.bin'])
    await expect(
      probeModuleSaveDir(locator, { USERPROFILE: 'C:\\Users\\a' }, listDirNames)
    ).resolves.toBeNull()
  })
})

describe('confirmSaveDir', () => {
  it('accepts a picked folder that contains identify files', async () => {
    await expect(
      confirmSaveDir(dummyModule.locate, 'D:\\saves', async () => ['save.txt'])
    ).resolves.toBe(true)
  })

  it('rejects an unrecognized folder', async () => {
    await expect(
      confirmSaveDir(dummyModule.locate, 'D:\\saves', async () => ['notes.txt'])
    ).resolves.toBe(false)
  })

  it('treats list failures as unrecognized instead of throwing', async () => {
    await expect(
      confirmSaveDir(dummyModule.locate, 'D:\\saves', async () => {
        throw new Error('denied')
      })
    ).resolves.toBe(false)
  })
})
