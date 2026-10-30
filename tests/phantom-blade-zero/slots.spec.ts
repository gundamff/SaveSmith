import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/phantom-blade-zero/slots'

describe('phantom-blade-zero physical slots', () => {
  it('lists only the root main save and exposes at most one slot', () => {
    const bytes = new Uint8Array([1])
    expect(
      listSlots({
        dir: 'synthetic',
        files: [
          { relativePath: '1RealTime/PBZSaveGame.sav', bytes },
          { relativePath: '2Hourly\\PBZSaveGame.sav', bytes },
          { relativePath: '3Daily/PBZSaveGame.sav', bytes },
          { relativePath: 'PBZGameUserSettings.sav', bytes },
          { relativePath: 'PBZSaveGame.sav', bytes },
          { relativePath: 'PBZSAVEGAME.SAV', bytes }
        ]
      })
    ).toEqual([
      {
        id: 'pbz-main',
        exists: true,
        readable: true,
        title: 'PBZSaveGame.sav',
        sessionFiles: ['PBZSaveGame.sav']
      }
    ])
  })

  it('matches the root filename case-insensitively and reports unreadable bytes', () => {
    expect(
      listSlots({
        dir: 'synthetic',
        files: [{ relativePath: 'pbzsavegame.SAV', bytes: null }]
      })
    ).toEqual([
      {
        id: 'pbz-main',
        exists: true,
        readable: false,
        title: 'PBZSaveGame.sav',
        sessionFiles: ['pbzsavegame.SAV']
      }
    ])
  })

  it('ignores nested and unrelated files', () => {
    expect(
      listSlots({
        dir: 'synthetic',
        files: [
          { relativePath: '1RealTime/PBZSaveGame.sav', bytes: new Uint8Array() },
          { relativePath: 'settings.sav', bytes: new Uint8Array() }
        ]
      })
    ).toEqual([])
  })
})
