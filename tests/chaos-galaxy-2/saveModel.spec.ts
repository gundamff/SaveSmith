import { describe, expect, it } from 'vitest'
import type { Es3BinaryEntry } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { parseEs3Binary, serializeEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { SaveData } from '../../src/games/chaos-galaxy-2/model/saveModel'

function int(key: string, value: number, settings = 10): Es3BinaryEntry {
  return { key, settings, kind: 'int', value }
}

function bool(key: string, value: boolean, settings = 7): Es3BinaryEntry {
  return { key, settings, kind: 'bool', value }
}

function intArray(key: string, value: number[], settings = 0x1b): Es3BinaryEntry {
  return { key, settings, kind: 'int[]', value }
}

function fixtureEntries(extra: Es3BinaryEntry[] = []): Es3BinaryEntry[] {
  return [
    int('PlayFaction', 0),
    int('playMonth', 3),
    int('PlayerEconomicsLevel', 1),
    int('Faction0Gold', 100),
    int('Faction0Supply', 20),
    int('Faction0Prestige', 5),
    int('Planet1Faction', 0),
    int('Planet1Defense', 50),
    int('Planet1Resistance', 0),
    int('Planet1LabourPoint', 2),
    int('Planet1HQlevel', 1),
    intArray('Planet1OrbitalBuilding', [2, 0, -1], 0x23),
    intArray('Planet1OrbitalBuildingLevel', [1, 0, 0], 0x23),
    intArray('Planet1SurfaceBuilding', [8, 0, -1], 0x2f),
    intArray('Planet1SurfaceBuildingLevel', [1, 0, 0], 0x2f),
    int('Planet2Defense', 10),
    int('Commander1Exp', 0),
    int('Commander1Admin', 10),
    int('Commander1Military', 11),
    int('Commander1Intellect', 12),
    int('Commander1Breeding', 13),
    int('Commander1Star', 1),
    intArray('Commander1Skills', [1, 0, 0, 0, 0, 0], 0x23),
    int('Fleet1Faction', 0),
    int('Fleet1Commander', 1),
    intArray('Fleet1Flagship', [165, 0, 2400, 750]),
    intArray('Fleet1Unit1', [44, 0, 1650, 600]),
    bool('Faction0AlienUnlocked', false),
    { key: 'UnknownThing', settings: 9, kind: 'string', value: 'keep' },
    {
      key: 'Faction0BuildableUnits',
      settings: 12,
      kind: 'raw',
      rawPayload: new Uint8Array([0x53, 0xff, 0x56, 0x08, 0xa8, 0xe2, 0, 0, 0, 0, 0])
    },
    ...extra
  ]
}

function load(extra: Es3BinaryEntry[] = []): SaveData {
  return SaveData.load(serializeEs3Binary(fixtureEntries(extra)))
}

describe('SaveData campaign projection', () => {
  it('loads resource scalars from flat keys', () => {
    const save = load()
    expect(save.getPlayFaction()).toBe(0)
    expect(save.getFactionGold(0)).toBe(100)
    expect(save.getFactionSupply(0)).toBe(20)
    expect(save.getFactionPrestige(0)).toBe(5)
    expect(save.getPlayerEconomicsLevel()).toBe(1)
    expect(save.getPlayMonth()).toBe(3)
  })

  it('setFactionGold rewrites the int and round-trips bytes for other keys', () => {
    const original = serializeEs3Binary(fixtureEntries())
    const save = SaveData.load(original)
    save.setFactionGold(0, 9999)
    save.setFactionSupply(0, 40)
    save.setFactionPrestige(0, 8)
    save.setPlayerEconomicsLevel(4)
    save.setPlayMonth(12)

    const again = SaveData.load(save.serialize())
    expect(again.getFactionGold(0)).toBe(9999)
    expect(again.getFactionSupply(0)).toBe(40)
    expect(again.getFactionPrestige(0)).toBe(8)
    expect(again.getPlayerEconomicsLevel()).toBe(4)
    expect(again.getPlayMonth()).toBe(12)
    expect(getEntryValue(again.entries, 'UnknownThing')).toBe('keep')
    expect([...save.serialize()]).not.toEqual([...original])
  })

  it('lists planets by Planet{id}Defense and reads HQ / buildings', () => {
    const save = load()
    expect(save.listPlanetIds()).toEqual([1, 2])
    const p1 = save.getPlanet(1)
    expect(p1).toMatchObject({
      id: 1,
      faction: 0,
      defense: 50,
      resistance: 0,
      labourPoint: 2,
      hqLevel: 1
    })
    expect(p1.orbitalBuilding).toEqual([2, 0, -1])
    expect(p1.orbitalBuildingLevel).toEqual([1, 0, 0])
    expect(p1.surfaceBuilding).toEqual([8, 0, -1])
    expect(p1.surfaceBuildingLevel).toEqual([1, 0, 0])
    expect(save.getPlanet(2).defense).toBe(10)
  })

  it('setPlanetField updates scalar and array keys in place', () => {
    const save = load()
    save.setPlanetField(1, 'defense', 80)
    save.setPlanetField(1, 'hqLevel', 3)
    save.setPlanetField(1, 'orbitalBuilding', [9, 1, 2])
    const p1 = SaveData.load(save.serialize()).getPlanet(1)
    expect(p1.defense).toBe(80)
    expect(p1.hqLevel).toBe(3)
    expect(p1.orbitalBuilding).toEqual([9, 1, 2])
  })

  it('lists commanders by Commander{id}Exp and patches existing values only', () => {
    const save = load()
    expect(save.listCommanderIds()).toEqual([1])
    expect(save.getCommander(1)).toEqual({
      id: 1,
      exp: 0,
      admin: 10,
      military: 11,
      intellect: 12,
      breeding: 13,
      star: 1,
      skills: [1, 0, 0, 0, 0, 0]
    })

    save.setCommander(1, { exp: 5000, star: 5, skills: [2, 3, 0, 0, 0, 0] })
    const row = SaveData.load(save.serialize()).getCommander(1)
    expect(row.exp).toBe(5000)
    expect(row.star).toBe(5)
    expect(row.admin).toBe(10)
    expect(row.skills).toEqual([2, 3, 0, 0, 0, 0])
  })

  it('refuses to add a commander that has no Exp key', () => {
    const save = load()
    expect(() => save.setCommander(99, { exp: 1 })).toThrow(/Commander99Exp/)
    expect(save.listCommanderIds()).toEqual([1])
  })

  it('projects Fleet{i}Unit1..14 as length-14 slots with int[4] tuples', () => {
    const save = load()
    expect(save.listFleetIds()).toEqual([1])
    const fleet = save.getFleet(1)
    expect(fleet.faction).toBe(0)
    expect(fleet.commander).toBe(1)
    expect(fleet.flagship).toEqual([165, 0, 2400, 750])
    expect(fleet.units).toHaveLength(14)
    expect(fleet.units[0]).toEqual([44, 0, 1650, 600])
    expect(fleet.units.slice(1).every((slot) => slot === null)).toBe(true)

    save.setFleetUnit(1, 1, [10, 0, 1, 2])
    save.setFleetCommander(1, 7)
    const again = SaveData.load(save.serialize()).getFleet(1)
    expect(again.units[0]).toEqual([10, 0, 1, 2])
    expect(again.commander).toBe(7)
  })

  it('getCommanderFactionMap prefers play faction and fills from FactionNLeader', () => {
    const save = load([
      int('Fleet2Faction', 4),
      int('Fleet2Commander', 20),
      int('Fleet3Faction', 1),
      int('Fleet3Commander', 20),
      int('Faction4Leader', 99),
      int('Commander20Exp', 0),
      int('Commander99Exp', 0)
    ])
    const map = save.getCommanderFactionMap(4)
    expect(map.get(20)).toBe(4)
    expect(map.get(99)).toBe(4)
    expect(map.get(1)).toBe(0)
  })

  it('does not create a missing fleet unit slot', () => {
    const save = load()
    expect(() => save.setFleetUnit(1, 2, [1, 0, 0, 0])).toThrow(/Fleet1Unit2/)
    expect(save.getFleet(1).units[1]).toBeNull()
  })

  it('unlockAllKnown sets bool unlock flags and leaves raw entries alone', () => {
    const save = load()
    save.unlockAllKnown(0)
    const again = parseEs3Binary(save.serialize())
    expect(again.find((e) => e.key === 'Faction0AlienUnlocked')?.value).toBe(true)
    const raw = again.find((e) => e.key === 'Faction0BuildableUnits')
    expect(raw?.kind).toBe('raw')
    expect(raw?.rawPayload).toEqual(
      new Uint8Array([0x53, 0xff, 0x56, 0x08, 0xa8, 0xe2, 0, 0, 0, 0, 0])
    )
  })

  it('unlockAllKnown does not treat Faction10 as faction 1', () => {
    const save = load([bool('Faction1AlienUnlocked', false), bool('Faction10AlienUnlocked', false)])
    save.unlockAllKnown(1)
    const again = parseEs3Binary(save.serialize())
    expect(again.find((e) => e.key === 'Faction1AlienUnlocked')?.value).toBe(true)
    expect(again.find((e) => e.key === 'Faction10AlienUnlocked')?.value).toBe(false)
  })

  it('preserves unknown entries and order on unedited serialize', () => {
    const original = serializeEs3Binary(fixtureEntries())
    const save = SaveData.load(original)
    expect([...save.serialize()]).toEqual([...original])
  })
})

function getEntryValue(entries: Es3BinaryEntry[], key: string) {
  return entries.find((e) => e.key === key)?.value
}
