import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/re2-i-rise-alone/slots'
import { AUTO_SLOT_ID, makeCipherFixture, MANUAL_SLOT_ID } from './fixtures'

describe('re2ira listSlots', () => {
  it('lists 2 readable slots with UUID ids', () => {
    const bytes = makeCipherFixture()
    const slots = listSlots({
      dir: 'x',
      files: [{ relativePath: 'SaveData.dat', bytes }]
    })
    expect(slots).toHaveLength(2)
    expect(slots.map((s) => s.id).sort()).toEqual([AUTO_SLOT_ID, MANUAL_SLOT_ID].sort())
    expect(slots.every((s) => s.readable)).toBe(true)
    expect(slots.every((s) => s.sessionFiles?.includes('SaveData.dat'))).toBe(true)
  })

  it('returns unreadable placeholder when bytes missing', () => {
    const slots = listSlots({
      dir: 'x',
      files: [{ relativePath: 'SaveData.dat', bytes: null }]
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]!.readable).toBe(false)
    expect(slots[0]!.id).toBe('SaveData.dat')
  })
})