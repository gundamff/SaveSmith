import { describe, expect, it } from 'vitest'
import { parse } from '../../src/games/re2-i-rise-alone/parse'
import { RESOURCE_KEYS } from '../../src/games/re2-i-rise-alone/model/resources'
import { AUTO_SLOT_ID, makeCipherFixture, MANUAL_SLOT_ID } from './fixtures'

describe('ParseContext (host session slotId)', () => {
  it('parse(files, { slotId: auto }) selects auto slot resources', () => {
    const bytes = makeCipherFixture()
    const files = [{ relativePath: 'SaveData.dat', bytes }]
    const manual = parse(files, { slotId: MANUAL_SLOT_ID })
    const auto = parse(files, { slotId: AUTO_SLOT_ID })

    expect(auto.slotId).toBe(AUTO_SLOT_ID)
    expect(auto.kind).toBe('auto')
    expect(Object.keys(auto.resources).sort()).toEqual([...RESOURCE_KEYS].sort())
    expect(auto.resources.Money).toBe(200)

    expect(manual.slotId).toBe(MANUAL_SLOT_ID)
    expect(manual.kind).toBe('manual')
    expect(Object.keys(manual.resources).sort()).toEqual(['Money', 'Stamina'])
    expect(manual.resources.Money).toBe(100)
  })
})