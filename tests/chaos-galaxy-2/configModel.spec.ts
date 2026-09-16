import { describe, expect, it } from 'vitest'
import { serializeEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { ConfigSnapshot } from '../../src/games/chaos-galaxy-2/model/configModel'

function fixtureConfigBytes(): Uint8Array {
  return serializeEs3Binary([
    { key: 'Volume', settings: 1, kind: 'int', value: 80 },
    {
      key: 'CommanderCollections',
      settings: 0x010b,
      kind: 'bool[]',
      value: [false, true, false, false]
    },
    { key: 'UnitCollections', settings: 0x010b, kind: 'bool[]', value: [false, false] },
    { key: 'EventCollections', settings: 0x010b, kind: 'bool[]', value: [true, false, false] },
    { key: 'LangeuageSet', settings: 9, kind: 'string', value: 'CN' }
  ])
}

describe('ConfigSnapshot collections', () => {
  it('flips a collection bit without touching settings keys', () => {
    const config = ConfigSnapshot.load(fixtureConfigBytes())
    expect(config.getCollection('CommanderCollections')).toEqual([false, true, false, false])

    config.setCollectionBit('CommanderCollections', 0, true)

    expect(config.getCollection('CommanderCollections')).toEqual([true, true, false, false])
    expect(config.entries.find((e) => e.key === 'Volume')?.value).toBe(80)
    expect(config.entries.find((e) => e.key === 'LangeuageSet')?.value).toBe('CN')
  })

  it('maxAllCollections lights every collection bit and leaves Volume alone', () => {
    const config = ConfigSnapshot.load(fixtureConfigBytes())
    config.maxAllCollections()
    expect(config.getCollection('CommanderCollections').every(Boolean)).toBe(true)
    expect(config.getCollection('UnitCollections').every(Boolean)).toBe(true)
    expect(config.getCollection('EventCollections').every(Boolean)).toBe(true)
    expect(config.entries.find((e) => e.key === 'Volume')?.value).toBe(80)
  })

  it('maxAllCollections lights only catalog-length bits and leaves padding false', () => {
    const bytes = serializeEs3Binary([
      { key: 'Volume', settings: 1, kind: 'int', value: 80 },
      {
        key: 'CommanderCollections',
        settings: 0x010b,
        kind: 'bool[]',
        value: Array(256).fill(false)
      },
      {
        key: 'UnitCollections',
        settings: 0x010b,
        kind: 'bool[]',
        value: Array(512).fill(false)
      },
      {
        key: 'EventCollections',
        settings: 0x010b,
        kind: 'bool[]',
        value: Array(128).fill(false)
      }
    ])
    const config = ConfigSnapshot.load(bytes)
    config.maxAllCollections()
    const commanders = config.getCollection('CommanderCollections')
    const units = config.getCollection('UnitCollections')
    const events = config.getCollection('EventCollections')
    expect(commanders).toHaveLength(256)
    expect(units).toHaveLength(512)
    expect(events).toHaveLength(128)
    expect(commanders.slice(0, 98).every(Boolean)).toBe(true)
    expect(commanders.slice(98).every((bit) => bit === false)).toBe(true)
    expect(units.slice(0, 245).every(Boolean)).toBe(true)
    expect(units.slice(245).every((bit) => bit === false)).toBe(true)
    expect(events.slice(0, 50).every(Boolean)).toBe(true)
    expect(events.slice(50).every((bit) => bit === false)).toBe(true)
    expect(config.entries.find((e) => e.key === 'Volume')?.value).toBe(80)
  })

  it('rejects an out-of-range collection bit index', () => {
    const config = ConfigSnapshot.load(fixtureConfigBytes())
    expect(() => config.setCollectionBit('UnitCollections', 9, true)).toThrow()
  })

  it('round-trips bytes after a bit flip', () => {
    const config = ConfigSnapshot.load(fixtureConfigBytes())
    config.setCollectionBit('EventCollections', 1, true)
    const again = ConfigSnapshot.load(config.serialize())
    expect(again.getCollection('EventCollections')).toEqual([true, true, false])
    expect(again.entries.find((e) => e.key === 'Volume')?.value).toBe(80)
  })
})
