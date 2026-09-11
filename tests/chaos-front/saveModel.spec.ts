import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { UNLOCKABLE_UNIT_TYPE_IDS, gameData, type GameData } from '../../src/games/chaos-front/model/gameData'
import {
  SaveData,
  loadCollectionText,
  maxCollection,
  serializeCollectionText
} from '../../src/games/chaos-front/model/saveModel'

const fixture = (): string => readFileSync(join(__dirname, 'fixtures/minimal-save.json'), 'utf8')

const gd: GameData = {
  unitTypes: [
    { id: 1, name: '侦察舰', kind: 1, size: 2, levelType: 3, model: 1 },
    { id: 5, name: '云雀', kind: 1, size: 2, levelType: 6, model: 5 },
    { id: 35, name: '剑士I', kind: 2, size: 0, levelType: 1, model: 17 },
    { id: 92, name: '最终机', kind: 2, size: 1, levelType: 7, model: 92 }
  ],
  characters: [
    { id: 84, name: '甲', portrait: 34 },
    { id: 85, name: '乙', portrait: 35 },
    { id: 87, name: '红玉', portrait: 87 }
  ],
  items: [
    { id: 1, name: '修理包', icon: 0 },
    { id: 2, name: '强化件', icon: 1 },
    { id: 3, name: '新装备', icon: 2 }
  ],
  armies: [
    { id: 2, name: '委员会军第一舰队', flag: 2 },
    { id: 3, name: '委员会军第二舰队', flag: 3 },
    { id: 4, name: '马西利亚革命军', flag: 4 },
    { id: 5, name: '黑旗舰队', flag: 5 }
  ],
  planets: [
    { id: 1, name: '马西利亚' },
    { id: 2, name: '巴巴里' },
    { id: 3, name: '呼罗珊' },
    { id: 4, name: '达契亚' },
    { id: 5, name: '霸州' }
  ],
  levelTables: {
    '1': [0, 180, 420, 720, 1080, 1680, 2400],
    '3': [0, 240, 560, 960, 1440, 2230, 3190],
    '6': [0, 400, 930, 1600, 2390, 3720, 5320],
    '7': [0, 380, 880, 1500, 2250, 3500, 5000]
  },
  unitMaxExp: { '1': 3190, '5': 5320, '35': 2400, '92': 5000 }
}

describe('SaveData', () => {
  it('loads snapshot fields', () => {
    const s = SaveData.load(fixture())
    expect(s.credit).toBe(9788541)
    expect(s.armyName).toBe('焰火团')
    expect(s.armyId).toBe(12)
    expect(s.units).toHaveLength(2)
    expect(s.units[1].unitType).toBe(78)
    expect(s.characters).toEqual([84, 87, 83])
  })

  it('modifies resources without touching other fields', () => {
    const s = SaveData.load(fixture())
    s.setCredit(1)
    s.setMedal(0, 999)
    s.setRelationship(2, 500)
    const s2 = SaveData.load(s.serialize())
    expect(s2.credit).toBe(1)
    expect(s2.medals[0]).toBe(999)
    expect(s2.relationships[2]).toBe(500)
    expect(s2.armyName).toBe('焰火团')
    expect(s2.units).toHaveLength(2)
  })

  it('maxAllUnits uses per-unit levelType EXP6', () => {
    const s = SaveData.load(fixture())
    const n = s.maxAllUnits(gd)
    expect(n).toBe(2)
    const s2 = SaveData.load(s.serialize())
    expect(s2.units[0].exp).toBe(5320) // unitType 5 -> levelType 6 表 EXP6
    expect(s2.units[1].exp).toBe(5320)
  })

  it('addUnit places a fresh unit with chosen level', () => {
    const s = SaveData.load(fixture())
    const u = s.addUnit(gd, 92, 6)
    expect(u.armyId).toBe(12)
    expect(u.exp).toBe(5000)
    expect(u.characterId).toBe(0)
    expect(u.items).toEqual([])
    const s2 = SaveData.load(s.serialize())
    expect(s2.units).toHaveLength(3)
    expect(s2.units[2].unitType).toBe(92)
  })

  it('removeUnit returns items to PlayerItems', () => {
    const s = SaveData.load(fixture())
    const before = s.docPlayerItems().slice()
    s.removeUnit(1) // unit 78 持有 items [1,1]
    const s2 = SaveData.load(s.serialize())
    expect(s2.units).toHaveLength(1)
    const after = s2.docPlayerItems()
    expect(after[0]).toBe(before[0] + 2) // 两件 id=1 归还
  })

  it('equipItem / unequipItem sync PlayerItems; ships 4 slots, mechs 2', () => {
    const s = SaveData.load(fixture())
    const before = s.docPlayerItems()[0]
    // unit0 type 5 = 战舰 kind1 → 4 槽
    s.equipItem(0, 1, gd)
    expect(s.units[0].items).toEqual([1])
    expect(s.docPlayerItems()[0]).toBe(before - 1)
    s.unequipItem(0, 0)
    expect(s.units[0].items).toEqual([])
    expect(s.docPlayerItems()[0]).toBe(before)
    s.units[0].items = [1, 2, 3, 4]
    expect(() => s.equipItem(0, 1, gd)).toThrow(expect.objectContaining({ code: 'ITEM_FULL', args: [4] }))
    // unit1 type 78 不在 gd 表 → 按机体 2 槽
    s.units[1].items = [1, 1]
    s.docPlayerItems()[0] = 5
    expect(() => s.equipItem(1, 1, gd)).toThrow(expect.objectContaining({ code: 'ITEM_FULL', args: [2] }))
    s.units[0].items = []
    s.docPlayerItems()[1] = 0
    expect(() => s.equipItem(0, 2, gd)).toThrow(expect.objectContaining({ code: 'ITEM_EMPTY' }))
  })

  it('maxAllPilots sets every pilot exp to 20000', () => {
    const s = SaveData.load(fixture())
    expect(s.maxAllPilots()).toBe(3)
    const s2 = SaveData.load(s.serialize())
    expect(s2.characterExps).toEqual([20000, 20000, 20000])
  })

  it('sanitizeUnlockedUnitTypes drops 未使用 placeholders', () => {
    const s = SaveData.load(fixture())
    s.setUnlockedUnitTypes([1, 13, 35])
    expect(s.sanitizeUnlockedUnitTypes(gameData)).toBe(1)
    expect(s.unlockedUnitTypes).toEqual([1, 35])
  })

  it('unlockAllUnitTypes unlocks only non-未使用 unit types', () => {
    const s = SaveData.load(fixture())
    s.unlockAllUnitTypes()
    const s2 = SaveData.load(s.serialize())
    expect(s2.unlockedUnitTypes).toEqual(UNLOCKABLE_UNIT_TYPE_IDS)
    expect(s2.unlockedUnitTypes).not.toContain(13)
    expect(s2.unlockedUnitTypes).toHaveLength(68)
  })

  it('unlockAllItems unlocks every non-未使用 item', () => {
    const s = SaveData.load(fixture())
    s.unlockAllItems(gd)
    const s2 = SaveData.load(s.serialize())
    expect(s2.unlockedItems).toEqual([1, 2, 3])
  })

  it('unlockAllItems skips 未使用 placeholders', () => {
    const withUnused: GameData = {
      ...gd,
      items: [
        ...gd.items,
        { id: 99, name: '未使用', icon: 0 }
      ]
    }
    const s = SaveData.load(fixture())
    s.unlockAllItems(withUnused)
    expect(s.unlockedItems).toEqual([1, 2, 3])
    expect(s.unlockedItems).not.toContain(99)
  })

  it('rejects structurally broken saves with MISSING_FIELD', () => {
    expect(() => SaveData.load('{"Whatever": {"value": 1}}')).toThrow(ModuleError)
    try {
      SaveData.load('{"Whatever": {"value": 1}}')
    } catch (e) {
      expect(e).toMatchObject({ code: 'MISSING_FIELD', args: ['PlayerUnits'] })
      expect(e).toBeInstanceOf(ModuleError)
      expect(String(e)).not.toMatch(/存档缺少字段/)
    }
  })

  it('factionLabel maps medal/relationship index to FactionData army name', () => {
    const s = SaveData.load(fixture())
    expect(s.factionLabel(gd, 0)).toBe('委员会军第一舰队')
    expect(s.factionLabel(gd, 3)).toBe('黑旗舰队')
  })

  it('setPlanetFaction moves planet id between FactionData.planets lists', () => {
    const s = SaveData.load(fixture())
    expect(s.planets[0].faction).toBe(3)
    s.setPlanetFaction(0, 1)
    const s2 = SaveData.load(s.serialize())
    expect(s2.planets[0].faction).toBe(1)
    const f1 = s2.factions.find((f) => f.id === 1)!
    const f3 = s2.factions.find((f) => f.id === 3)!
    expect(f1.planets).toEqual(expect.arrayContaining([1, 2, 4]))
    expect(f3.planets).not.toContain(1)
  })

  it('setPlanetStat clamps to Max and marks value', () => {
    const s = SaveData.load(fixture())
    s.setPlanetStat(0, 'economics', 99999)
    expect(s.planets[0].economics).toBe(900)
    s.setPlanetStat(0, 'stability', 50)
    expect(s.planets[0].stability).toBe(50)
  })

  it('deployUnit places undeployed unit and undeploy clears to [0,0]', () => {
    const s = SaveData.load(fixture())
    expect(s.isUndeployed(s.units[0])).toBe(true)
    expect(s.unitAt(1, 0)).toBe(-1)
    s.setUnitPilot(0, 84)
    s.deployUnit(0, 1, 0)
    expect(s.units[0].number).toEqual([1, 0])
    expect(s.unitAt(1, 0)).toBe(0)
    s.undeployUnit(0)
    expect(s.units[0].number).toEqual([0, 0])
    expect(s.unitAt(1, 0)).toBe(-1)
  })

  it('deployUnit onto occupied slot swaps positions', () => {
    const s = SaveData.load(fixture())
    s.setUnitPilot(0, 84)
    // unit1 already at [1,2]
    s.deployUnit(0, 1, 2)
    expect(s.units[0].number).toEqual([1, 2])
    expect(s.units[1].number).toEqual([0, 0])
  })

  it('setUnitPilot rejects duplicate pilot on another unit', () => {
    const s = SaveData.load(fixture())
    expect(s.units[1].characterId).toBe(85)
    expect(() => s.setUnitPilot(0, 85)).toThrow(
      expect.objectContaining({ code: 'PILOT_TAKEN' })
    )
    s.setUnitPilot(0, 84)
    expect(s.units[0].characterId).toBe(84)
    s.setUnitPilot(0, 0)
    expect(s.units[0].characterId).toBe(0)
  })

  it('allows deploy without pilot but rejects clear-pilot and save', () => {
    const s = SaveData.load(fixture())
    s.deployUnit(0, 1, 0)
    expect(s.units[0].number).toEqual([1, 0])
    expect(() => s.setUnitPilot(1, 0)).toThrow(expect.objectContaining({ code: 'DEPLOYED_NO_PILOT' }))
    expect(() => s.serialize()).toThrow(expect.objectContaining({ code: 'DEPLOYED_NO_PILOT' }))
    s.setUnitPilot(0, 84)
    expect(() => s.serialize()).not.toThrow()
  })

  it('deployUnit rejects out-of-range grid', () => {
    const s = SaveData.load(fixture())
    s.setUnitPilot(0, 84)
    expect(() => s.deployUnit(0, 0, 0)).toThrow(expect.objectContaining({ code: 'FORMATION_OUT_OF_RANGE' }))
    expect(() => s.deployUnit(0, 5, 0)).toThrow(expect.objectContaining({ code: 'FORMATION_OUT_OF_RANGE' }))
    expect(() => s.deployUnit(0, 1, 6)).toThrow(expect.objectContaining({ code: 'FORMATION_OUT_OF_RANGE' }))
  })
})

describe('collection.cf', () => {
  const text = JSON.stringify({
    Endings: {
      __type: 'System.Boolean[],mscorlib',
      value: [true, false, false, false, false, false, false, false]
    },
    Units: { __type: 'System.Int32[],mscorlib', value: new Array(51).fill(0) },
    Members: { __type: 'System.Int32[],mscorlib', value: new Array(42).fill(0) }
  })

  it('maxes collection', () => {
    const c = loadCollectionText(text)
    maxCollection(c)
    expect(c.endings.every(Boolean)).toBe(true)
    expect(c.units.every((v) => v === 7)).toBe(true)
    expect(c.members.every((v) => v === 10)).toBe(true)
    const back = serializeCollectionText(c)
    expect(JSON.parse(back).Units.value[0]).toBe(7)
  })
})
