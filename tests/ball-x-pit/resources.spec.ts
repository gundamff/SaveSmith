import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { validateEnvelope } from '../../src/games/ball-x-pit/model/binary'
import {
  locateNumResources,
  readResources,
  writeResources
} from '../../src/games/ball-x-pit/model/resources'
import { buildMinimalSave } from './fixtures'

describe('ball-x-pit resources', () => {
  it('reads and writes count5 layout without resizing', () => {
    const original = buildMinimalSave({
      resourceLayout: 'count5',
      resources: { money: 1, rice: 2, wood: 3, stone: 4 }
    })
    validateEnvelope(original)
    expect(locateNumResources(original).layout).toBe('count5')
    expect(readResources(original)).toEqual({ money: 1, rice: 2, wood: 3, stone: 4 })

    const edited = new Uint8Array(original)
    writeResources(edited, { money: 0x11223344, rice: 0x55667788, wood: 0x19abcdef, stone: 0x01020304 })
    expect(edited.length).toBe(original.length)
    expect(readResources(edited)).toEqual({
      money: 0x11223344,
      rice: 0x55667788,
      wood: 0x19abcdef,
      stone: 0x01020304
    })
    // only the four resource int32 slots may change
    const loc = locateNumResources(edited)
    const resourceOffsets = new Set([
      ...Object.values(loc.offsets).flatMap((o) => [o, o + 1, o + 2, o + 3])
    ])
    for (let i = 0; i < original.length; i++) {
      if (!resourceOffsets.has(i)) expect(edited[i]).toBe(original[i])
    }
  })

  it('reads and writes count4 layout', () => {
    const data = buildMinimalSave({
      resourceLayout: 'count4',
      resources: { money: 9, rice: 8, wood: 7, stone: 6 }
    })
    expect(locateNumResources(data).layout).toBe('count4')
    expect(readResources(data)).toEqual({ money: 9, rice: 8, wood: 7, stone: 6 })
    writeResources(data, { money: 11, rice: 12, wood: 13, stone: 14 })
    expect(readResources(data)).toEqual({ money: 11, rice: 12, wood: 13, stone: 14 })
  })

  it('rejects negative resources', () => {
    const data = buildMinimalSave()
    expect(() => writeResources(data, { money: -1, rice: 0, wood: 0, stone: 0 })).toThrow(
      ModuleError
    )
  })
})
