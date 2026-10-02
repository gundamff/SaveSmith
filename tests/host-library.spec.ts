import { describe, expect, it, vi } from 'vitest'
import { dummyModule } from './dummyModule'
import { confirmSaveDir, probeModuleSaveDir } from '@host/probe'
import { modules } from '@host/registry'

describe('registry', () => {
  it('registers compiled game modules in registry order', () => {
    expect(Array.isArray(modules)).toBe(true)
    expect(modules).toHaveLength(8)
    expect(modules.map((m) => m.id)).toEqual([
      'chaos-front',
      'chaos-galaxy-2',
      'dead-cells',
      'wanderburg',
      'terraria',
      'dragon-sword',
      'eslabong',
      'ace-combat-8'
    ])
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

  it('expands * wildcard segments (e.g. Steam userdata accounts)', async () => {
    const wildcard = {
      windowsPathTemplates: ['C:\\Steam\\userdata\\*\\588650\\remote'],
      identifyAnyOf: ['user_0.dat']
    }
    const listDirNames = vi.fn(async (dir: string) => {
      if (dir === 'C:\\Steam\\userdata') return ['111', '222']
      if (dir === 'C:\\Steam\\userdata\\222\\588650\\remote') return ['user_0.dat']
      return []
    })
    await expect(probeModuleSaveDir(wildcard, {}, listDirNames)).resolves.toBe(
      'C:\\Steam\\userdata\\222\\588650\\remote'
    )
  })

  it('skips templates whose env vars are unavailable instead of building junk paths', async () => {
    const withEnv = {
      windowsPathTemplates: ['%NOPE%\\Saved Games\\Dead Cells', '%USERPROFILE%\\y'],
      identifyAnyOf: ['user_0.dat']
    }
    const listDirNames = vi.fn(async (dir: string) =>
      dir === 'C:\\Users\\a\\y' ? ['user_0.dat'] : []
    )
    await expect(probeModuleSaveDir(withEnv, { USERPROFILE: 'C:\\Users\\a' }, listDirNames)).resolves.toBe(
      'C:\\Users\\a\\y'
    )
    expect(listDirNames).not.toHaveBeenCalledWith(expect.stringContaining('NOPE'))
  })

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
