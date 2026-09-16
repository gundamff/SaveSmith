import { describe, expect, it } from 'vitest'
import { serializeEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { clampCommander, clampFactionResources } from '../../src/games/chaos-galaxy-2/model/caps'
import { gameData } from '../../src/games/chaos-galaxy-2/model/gameData'
import { SaveData, type CommanderRow } from '../../src/games/chaos-galaxy-2/model/saveModel'
import { parse, validate } from '../../src/games/chaos-galaxy-2/parse'

function overCapCampaign(): Uint8Array {
  return serializeEs3Binary([
    { key: 'PlayFaction', settings: 10, kind: 'int', value: 0 },
    { key: 'Faction0Gold', settings: 10, kind: 'int', value: 2_000_000_000 },
    { key: 'Faction0Supply', settings: 10, kind: 'int', value: -10 },
    { key: 'Faction0Prestige', settings: 10, kind: 'int', value: 50 },
    { key: 'Planet1Defense', settings: 10, kind: 'int', value: 5000 },
    { key: 'Planet1HQlevel', settings: 10, kind: 'int', value: 99 },
    { key: 'Commander1Exp', settings: 10, kind: 'int', value: 9_999_999 },
    { key: 'Commander1Admin', settings: 10, kind: 'int', value: 200 },
    { key: 'Commander1Military', settings: 10, kind: 'int', value: -3 },
    { key: 'Commander1Intellect', settings: 10, kind: 'int', value: 50 },
    { key: 'Commander1Breeding', settings: 10, kind: 'int', value: 99 },
    { key: 'Commander1Star', settings: 10, kind: 'int', value: 99 }
  ])
}

describe('caps', () => {
  it('clampCommander caps exp, star, and stats from game-data caps', () => {
    const row: CommanderRow = {
      id: 1,
      exp: 9_999_999,
      admin: 200,
      military: -3,
      intellect: 50,
      breeding: 99,
      star: 99,
      skills: [1, 2]
    }
    const clamped = clampCommander(row, gameData)
    expect(clamped.exp).toBe(gameData.commanderMaxExp)
    expect(clamped.star).toBe(gameData.commanderMaxStar)
    expect(clamped.admin).toBe(gameData.commanderMaxStat)
    expect(clamped.military).toBe(0)
    expect(clamped.intellect).toBe(50)
    expect(clamped.breeding).toBe(gameData.commanderMaxStat)
    expect(clamped.skills).toEqual([1, 2])
    expect(clamped.id).toBe(1)
  })

  it('clampFactionResources writes gold/supply/prestige within game-data caps', () => {
    const save = SaveData.load(overCapCampaign())
    clampFactionResources(save, 0, gameData)
    expect(save.getFactionGold(0)).toBe(gameData.resourceMaxGold)
    expect(save.getFactionSupply(0)).toBe(0)
    expect(save.getFactionPrestige(0)).toBe(50)
  })

  it('validate mutates over-cap fields in place and returns no issues', () => {
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: overCapCampaign() }])
    expect(validate(state)).toEqual([])
    expect(state.campaign.getCommander(1).exp).toBe(gameData.commanderMaxExp)
    expect(state.campaign.getCommander(1).star).toBe(gameData.commanderMaxStar)
    expect(state.campaign.getCommander(1).admin).toBe(gameData.commanderMaxStat)
    expect(state.campaign.getCommander(1).military).toBe(0)
    expect(state.campaign.getFactionGold(0)).toBe(gameData.resourceMaxGold)
    expect(state.campaign.getFactionSupply(0)).toBe(0)
    expect(state.campaign.getPlanet(1).defense).toBe(gameData.planetMaxDefense)
    expect(state.campaign.getPlanet(1).hqLevel).toBe(gameData.planetMaxHqLevel)
  })

  it('validate clamps unknown fleet unit and flagship typeIds to 0 and keeps catalog ids', () => {
    const bytes = serializeEs3Binary([
      { key: 'PlayFaction', settings: 10, kind: 'int', value: 0 },
      { key: 'Fleet1Faction', settings: 10, kind: 'int', value: 0 },
      { key: 'Fleet1Commander', settings: 10, kind: 'int', value: 1 },
      { key: 'Fleet1Flagship', settings: 0x1b, kind: 'int[]', value: [99999, 0, 2400, 750] },
      { key: 'Fleet1Unit1', settings: 0x1b, kind: 'int[]', value: [1, 0, 1650, 600] },
      { key: 'Fleet1Unit2', settings: 0x1b, kind: 'int[]', value: [88888, 0, 100, 50] },
      { key: 'Fleet1Unit3', settings: 0x1b, kind: 'int[]', value: [0, 0, 0, 0] }
    ])
    const state = parse([{ relativePath: 'savedata0.cg2', bytes }])
    expect(validate(state)).toEqual([])
    const fleet = state.campaign.getFleet(1)
    expect(fleet.flagship).toEqual([0, 0, 2400, 750])
    expect(fleet.units[0]).toEqual([1, 0, 1650, 600])
    expect(fleet.units[1]).toEqual([0, 0, 100, 50])
    expect(fleet.units[2]).toEqual([0, 0, 0, 0])
  })

  it('validate clamps a scalar Flagship typeId that is not in the unit catalog', () => {
    const bytes = serializeEs3Binary([
      { key: 'PlayFaction', settings: 10, kind: 'int', value: 0 },
      { key: 'Fleet2Faction', settings: 10, kind: 'int', value: 0 },
      { key: 'Fleet2Flagship', settings: 10, kind: 'int', value: 424242 }
    ])
    const state = parse([{ relativePath: 'savedata0.cg2', bytes }])
    expect(validate(state)).toEqual([])
    expect(state.campaign.getFleet(2).flagship).toBe(0)
  })
})
