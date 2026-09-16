import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { actions, applyAction } from '../../src/games/chaos-galaxy-2/actions'
import { serializeEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { gameData } from '../../src/games/chaos-galaxy-2/model/gameData'
import { parse } from '../../src/games/chaos-galaxy-2/parse'

function campaignBytes(): Uint8Array {
  return serializeEs3Binary([
    { key: 'PlayFaction', settings: 10, kind: 'int', value: 0 },
    { key: 'Faction0Gold', settings: 10, kind: 'int', value: 1 },
    { key: 'Faction0Supply', settings: 10, kind: 'int', value: 2 },
    { key: 'Faction0Prestige', settings: 10, kind: 'int', value: 3 },
    { key: 'Planet1Defense', settings: 10, kind: 'int', value: 10 },
    { key: 'Commander1Exp', settings: 10, kind: 'int', value: 0 },
    { key: 'Commander1Admin', settings: 10, kind: 'int', value: 1 },
    { key: 'Commander1Military', settings: 10, kind: 'int', value: 2 },
    { key: 'Commander1Intellect', settings: 10, kind: 'int', value: 3 },
    { key: 'Commander1Breeding', settings: 10, kind: 'int', value: 4 },
    { key: 'Commander1Star', settings: 10, kind: 'int', value: 1 },
    { key: 'Faction0AlienUnlocked', settings: 7, kind: 'bool', value: false }
  ])
}

function configBytes(): Uint8Array {
  return serializeEs3Binary([
    { key: 'Volume', settings: 1, kind: 'int', value: 80 },
    {
      key: 'CommanderCollections',
      settings: 0x010b,
      kind: 'bool[]',
      value: [false, false, true]
    }
  ])
}

describe('chaos-galaxy-2 actions', () => {
  it('lists fill-resources / max-commanders / unlock-all / max-collection with cg2. keys', () => {
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: campaignBytes() }])
    const specs = actions(state)
    expect(specs.map((a) => a.id)).toEqual([
      'fill-resources',
      'max-commanders',
      'unlock-all',
      'max-collection'
    ])
    expect(specs.every((a) => a.kind === 'button')).toBe(true)
    expect(specs.find((a) => a.id === 'fill-resources')?.labelKey).toBe('cg2.actions.fillResources')
    expect(specs.find((a) => a.id === 'max-commanders')?.labelKey).toBe('cg2.actions.maxCommanders')
    expect(specs.find((a) => a.id === 'unlock-all')?.labelKey).toBe('cg2.actions.unlockAll')
    expect(specs.find((a) => a.id === 'max-collection')?.labelKey).toBe('cg2.actions.maxCollection')
    expect(specs.find((a) => a.id === 'max-collection')?.disabled).toBe(true)
  })

  it('fill-resources writes play-faction gold/supply/prestige to stub caps', () => {
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: campaignBytes() }])
    const next = applyAction(state, 'fill-resources')
    expect(next).toBe(state)
    expect(state.campaign.getFactionGold(0)).toBe(gameData.resourceMaxGold)
    expect(state.campaign.getFactionSupply(0)).toBe(gameData.resourceMaxSupply)
    expect(state.campaign.getFactionPrestige(0)).toBe(gameData.resourceMaxPrestige)
  })

  it('max-commanders writes existing commander stats to stub caps', () => {
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: campaignBytes() }])
    applyAction(state, 'max-commanders')
    const row = state.campaign.getCommander(1)
    expect(row.exp).toBe(gameData.commanderMaxExp)
    expect(row.star).toBe(gameData.commanderMaxStar)
    expect(row.admin).toBe(gameData.commanderMaxStat)
    expect(row.military).toBe(gameData.commanderMaxStat)
    expect(row.intellect).toBe(gameData.commanderMaxStat)
    expect(row.breeding).toBe(gameData.commanderMaxStat)
  })

  it('unlock-all sets existing Faction{play}*Unlocked flags', () => {
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: campaignBytes() }])
    applyAction(state, 'unlock-all')
    expect(state.campaign.entries.find((e) => e.key === 'Faction0AlienUnlocked')?.value).toBe(true)
  })

  it('max-collection lights config bitmasks and leaves Volume alone', () => {
    const state = parse([
      { relativePath: 'savedata0.cg2', bytes: campaignBytes() },
      { relativePath: 'config.cg2', bytes: configBytes() }
    ])
    expect(actions(state).find((a) => a.id === 'max-collection')?.disabled).toBeFalsy()
    applyAction(state, 'max-collection')
    expect(state.config?.getCollection('CommanderCollections').every(Boolean)).toBe(true)
    expect(state.config?.entries.find((e) => e.key === 'Volume')?.value).toBe(80)
  })

  it('throws UNKNOWN_ACTION for an unknown id', () => {
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: campaignBytes() }])
    expect(() => applyAction(state, 'nope')).toThrow(ModuleError)
    try {
      applyAction(state, 'nope')
    } catch (e) {
      expect(e).toBeInstanceOf(ModuleError)
      expect((e as ModuleError).code).toBe('UNKNOWN_ACTION')
    }
  })
})
