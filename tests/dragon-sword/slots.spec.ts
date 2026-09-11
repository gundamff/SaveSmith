import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/dragon-sword/slots'
import { locate } from '../../src/games/dragon-sword/locate'

describe('dragon-sword locate', () => {
  it('identifies numeric account folders and slot db glob', () => {
    expect(locate.identifyAnyOf).toEqual([])
    expect(locate.identifyNameRegex).toBe('^[0-9]+$')
    expect(locate.slotFilePatterns).toEqual(['*/*_Slot*.db'])
    expect(locate.windowsPathTemplates.some((p) => p.includes('DragonSword  Awakening'))).toBe(true)
  })
})

describe('dragon-sword listSlots', () => {
  it('maps matching account/slot db paths to id account-slot', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        {
          relativePath: '136330193/136330193_Slot1.db',
          bytes: new Uint8Array([1])
        },
        {
          relativePath: '136330193/136330193_Slot2.db',
          bytes: null
        },
        {
          relativePath: '136330193/SPack_Slot1.sav',
          bytes: new Uint8Array([1])
        },
        {
          relativePath: '136330193/999_Slot1.db',
          bytes: new Uint8Array([1])
        }
      ]
    })
    expect(slots.map((s) => s.id)).toEqual(['136330193-1', '136330193-2'])
    expect(slots[0]).toMatchObject({
      id: '136330193-1',
      exists: true,
      readable: true,
      title: 'Account 136330193',
      subtitle: 'Slot 1',
      sessionFiles: ['136330193/136330193_Slot1.db']
    })
    expect(slots[1]?.readable).toBe(false)
  })
})
