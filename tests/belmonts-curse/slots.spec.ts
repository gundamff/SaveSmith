import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/belmonts-curse/slots'
import { utf8Encode } from '../../src/sdk/session'

describe('belmonts-curse slots', () => {
  it('lists BuildSave_*.sav and ignores PLAYERPREFS.sav', () => {
    const listed = {
      dir: 'X',
      files: [
        {
          relativePath: 'BuildSave_0.sav',
          bytes: utf8Encode(
            '{"version":"1.1.3","playerSave":{"level":9,"saveDate":"2026-10-17 11:45:00","playTimeInSeconds":10}}'
          )
        },
        { relativePath: 'PLAYERPREFS.sav', bytes: utf8Encode('{"ints":[]}') },
        { relativePath: 'steam_autocloud.vdf', bytes: null }
      ]
    }
    const slots = listSlots(listed)
    expect(slots.map((s) => s.id)).toEqual(['build-0'])
    expect(slots[0]!.sessionFiles).toEqual(['BuildSave_0.sav'])
    expect(slots[0]!.subtitle).toMatch(/Lv\.?9|9/)
  })
})
