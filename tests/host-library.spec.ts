import { describe, expect, it, vi } from 'vitest'
import { dummyModule } from './dummyModule'
import { confirmSaveDir, probeModuleSaveDir } from '@host/probe'
import { modules } from '@host/registry'

describe('registry', () => {
  it('registers compiled game modules in registry order', () => {
    expect(Array.isArray(modules)).toBe(true)
    expect(modules).toHaveLength(3)
    expect(modules.map((m) => m.id)).toEqual(['chaos-front', 'wanderburg', 'terraria'])
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

  it('probe prefers DOCUMENTS template when provided', async () => {
    const terrariaLocator = {
      windowsPathTemplates: [
        '%DOCUMENTS%\\My Games\\Terraria',
        '%USERPROFILE%\\Documents\\My Games\\Terraria'
      ],
      identifyAnyOf: ['Players']
    }
    const listDirNames = vi.fn(async (dir: string) => {
      if (dir === 'D:\\user\\Documents\\My Games\\Terraria') return ['Players', 'Worlds']
      return []
    })
    await expect(
      probeModuleSaveDir(
        terrariaLocator,
        { DOCUMENTS: 'D:\\user\\Documents', USERPROFILE: 'C:\\Users\\zhang' },
        listDirNames
      )
    ).resolves.toBe('D:\\user\\Documents\\My Games\\Terraria')
  })

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
