import { describe, expect, it } from 'vitest'
import { gameData } from '../../src/games/chaos-galaxy-2/model/gameData'
import { serializeEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { parse, validate } from '../../src/games/chaos-galaxy-2/parse'

const CAP_KEYS = [
  'commanderMaxExp',
  'commanderMaxStar',
  'commanderMaxStat',
  'planetMaxDefense',
  'planetMaxHqLevel',
  'resourceMaxGold',
  'resourceMaxSupply',
  'resourceMaxPrestige'
] as const

function campaignBytes(): Uint8Array {
  return serializeEs3Binary([
    { key: 'PlayFaction', settings: 10, kind: 'int', value: 0 },
    { key: 'Commander1Exp', settings: 10, kind: 'int', value: 0 }
  ])
}

describe('chaos-galaxy-2 game-data.json', () => {
  it('has non-empty commanders and units with extracted names', () => {
    expect(gameData.commanders.length).toBeGreaterThan(0)
    expect(gameData.units.length).toBeGreaterThan(0)
    expect(gameData.commanders[0]).toMatchObject({ id: 1, name: '文昌君' })
    expect(gameData.units[0]).toMatchObject({ id: 1, name: '作战卫星' })
  })

  it('has factions and chip skills with names', () => {
    expect(gameData.factions.length).toBeGreaterThanOrEqual(8)
    expect(gameData.factions[0]).toMatchObject({ id: 1, name: '勤王联军' })
    expect(gameData.chipSkills.length).toBeGreaterThanOrEqual(10)
    expect(gameData.chipSkills[0]).toMatchObject({ id: 1, name: '募兵专家' })
  })

  it('has 80 planets and Collection*Data catalog lengths', () => {
    expect(gameData.planets).toHaveLength(80)
    expect(gameData.planets[0]).toMatchObject({ id: 1, name: '幽方' })
    expect(gameData.collectionLengths).toEqual({
      commanders: 98,
      units: 245,
      events: 50
    })
  })

  it('cap fields are finite positives', () => {
    for (const key of CAP_KEYS) {
      const value = gameData[key]
      expect(Number.isFinite(value), key).toBe(true)
      expect(value, key).toBeGreaterThan(0)
    }
  })

  it('validate reports COLLECTION_LENGTH when a bitmask is shorter than catalog', () => {
    const configBytes = serializeEs3Binary([
      {
        key: 'CommanderCollections',
        settings: 0x010b,
        kind: 'bool[]',
        value: [false, true]
      },
      {
        key: 'UnitCollections',
        settings: 0x010b,
        kind: 'bool[]',
        value: Array(245).fill(false)
      },
      {
        key: 'EventCollections',
        settings: 0x010b,
        kind: 'bool[]',
        value: Array(50).fill(false)
      }
    ])
    const state = parse([
      { relativePath: 'savedata0.cg2', bytes: campaignBytes() },
      { relativePath: 'config.cg2', bytes: configBytes }
    ])
    expect(validate(state)).toEqual([
      { code: 'COLLECTION_LENGTH', args: ['CommanderCollections', 2, 98] }
    ])
  })

  it('validate allows collection bitmasks padded longer than catalog', () => {
    const configBytes = serializeEs3Binary([
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
    const state = parse([
      { relativePath: 'savedata0.cg2', bytes: campaignBytes() },
      { relativePath: 'config.cg2', bytes: configBytes }
    ])
    expect(validate(state)).toEqual([])
  })
})
