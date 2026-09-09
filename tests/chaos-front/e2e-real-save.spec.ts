import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseEs3 } from '../../src/games/chaos-front/model/es3'
import { ALL_UNIT_TYPE_IDS, gameData, unitMaxExpOf, type GameData } from '../../src/games/chaos-front/model/gameData'
import { CHARACTER_MAX_EXP } from '../../src/games/chaos-front/model/level'
import {
  SaveData,
  loadCollectionText,
  maxCollection,
  serializeCollectionText,
  type CollectionSnapshot,
  type UnitEntry
} from '../../src/games/chaos-front/model/saveModel'

/**
 * 真实存档 E2E（环境变量门控，任何机器/CI 不设 CF_SAVE 即整体跳过）：
 *   CF_SAVE             总开关；未设置时本文件全部 skip
 *   CFSE_E2E_SAVE       指向 savedata0.cf 的临时副本（仓库外，如 %TEMP%\cfse_e2e\savedata0.cf）
 *   CFSE_E2E_COLLECTION 指向 collection.cf 的临时副本（可选）
 * 真实存档绝不入库。
 */

const envPath = (name: string): string | null => {
  const v = process.env[name]
  if (!v) return null
  try {
    return statSync(v).isFile() ? v : null
  } catch {
    return null
  }
}

const savePath = envPath('CFSE_E2E_SAVE')
const collectionPath = envPath('CFSE_E2E_COLLECTION')
const haveSave = savePath !== null && existsSync(savePath)
const haveCollection = collectionPath !== null && existsSync(collectionPath)

interface Es3File {
  [k: string]: { __type?: string; value: unknown }
}

/** 载入真实存档（产品 parseEs3/SaveData.load，兼容 LitJson 裸键）+ 解析后的原始文档（用于往返比对） */
function loadRealSave(): { save: SaveData; doc: Es3File } {
  if (!savePath) throw new Error('CFSE_E2E_SAVE 未设置')
  const raw = readFileSync(savePath, 'utf8')
  const doc = parseEs3(raw) as Es3File
  return { save: SaveData.load(raw), doc }
}

const gd: GameData = gameData

/** 未被一键操作触碰的 PlayerUnits 子字段（exp 之外全部保持） */
const UNIT_UNTOUCHED = [
  'unitType',
  'armyId',
  'characterId',
  'items',
  'custom',
  'number',
  'playerName'
] as const
/** 被本套修改操作写入的顶层字段 */
const TARGETED = new Set([
  'PlayerUnits',
  'PlayerCharacterEXPs',
  'PlayerCredit',
  'PlayerUnlockedUnitTypes',
  'PlayerUnlockedItems'
])

describe.skipIf(!process.env.CF_SAVE)('chaos-front real save e2e', () => {
describe.skipIf(!haveSave)('E2E 真实存档 savedata0.cf（CFSE_E2E_SAVE）', () => {
  it('载入快照不变量：units>0 / pilots>0 / armyId 存在', () => {
    const { save } = loadRealSave()
    expect(save.units.length).toBeGreaterThan(0)
    expect(save.characterExps.length).toBeGreaterThan(0)
    expect(save.characters.length).toBe(save.characterExps.length)
    expect(Number.isInteger(save.armyId)).toBe(true)
    // 机型都在 gameData 92 种之内（maxAllUnits 才有确定目标）
    for (const u of save.units) {
      expect(gd.unitTypes.some((t) => t.id === u.unitType)).toBe(true)
    }
    console.log(
      `[e2e] 载入槽0: units=${save.units.length} pilots=${save.characterExps.length} ` +
        `armyId=${save.armyId} armyName=${save.armyName} credit=${save.credit} ` +
        `unlockedUnitTypes=${save.unlockedUnitTypes.length} unlockedItems=${save.unlockedItems.length}`
    )
  })

  it('全量修改 → 序列化 → 重载：exp 满级/驾驶员满级/全解锁/资源', () => {
    const { save, doc } = loadRealSave()
    const origUnits = doc.PlayerUnits.value as UnitEntry[]
    const origExps = doc.PlayerCharacterEXPs.value as number[]

    const unitsMaxed = save.maxAllUnits(gd)
    const pilotsMaxed = save.maxAllPilots()
    save.unlockAllUnitTypes()
    save.unlockAllItems(gd)
    save.setCredit(123456789)
    console.log(
      `[e2e] 修改计数: unitsMaxed=${unitsMaxed}/${save.units.length} ` +
        `pilotsMaxed=${pilotsMaxed}/${save.characterExps.length} ` +
        `unlockedUnitTypes ${save.unlockedUnitTypes.length} (->${ALL_UNIT_TYPE_IDS.length}) ` +
        `unlockedItems ->${gd.items.length} credit->123456789`
    )

    const serialized = save.serialize()
    expect(() => JSON.parse(serialized)).not.toThrow() // files.ts writeSlotFile 的严格 JSON 校验兼容
    const after = SaveData.load(serialized)

    // 机体经验：原值已 >= 上限的断言 >=（相等是其子集）；原值低于上限的断言精确等于上限
    expect(after.units).toHaveLength(origUnits.length)
    for (let i = 0; i < after.units.length; i++) {
      const max = unitMaxExpOf(gd, origUnits[i].unitType)
      if (origUnits[i].exp >= max) {
        expect(after.units[i].exp).toBeGreaterThanOrEqual(max)
      } else {
        expect(after.units[i].exp).toBe(max)
      }
      expect(origUnits[i].unitType).toBe(after.units[i].unitType)
    }

    // 驾驶员全部满级 20000
    expect(after.characterExps).toHaveLength(origExps.length)
    expect(after.characterExps.every((e) => e === CHARACTER_MAX_EXP)).toBe(true)

    // 全机型解锁：1..92 排序去重，与 ALL_UNIT_TYPE_IDS 一致
    const sortedUnique = [...new Set(after.unlockedUnitTypes)].sort((a, b) => a - b)
    expect(sortedUnique).toEqual(after.unlockedUnitTypes)
    expect(sortedUnique).toHaveLength(92)
    expect(sortedUnique[0]).toBe(1)
    expect(sortedUnique[sortedUnique.length - 1]).toBe(92)
    expect(after.unlockedUnitTypes).toEqual(ALL_UNIT_TYPE_IDS)

    // 全道具解锁：覆盖全部 16 种
    expect(after.unlockedItems).toEqual(gd.items.map((it) => it.id))
    expect(after.unlockedItems).toHaveLength(16)

    // 资源
    expect(after.credit).toBe(123456789)
  })

  it('未被触碰的字段往返保持（含 CurrentArmyRanks/HistoryTime/RealTime/PlayerCharacters 等）', () => {
    const { save, doc } = loadRealSave()
    const origDoc = JSON.parse(JSON.stringify(doc)) as Es3File
    save.maxAllUnits(gd)
    save.maxAllPilots()
    save.unlockAllUnitTypes()
    save.unlockAllItems(gd)
    save.setCredit(123456789)
    const afterDoc = JSON.parse(save.serialize()) as Es3File

    // 顶层键集合一致；所有字段的 __type 原样保留
    expect(Object.keys(afterDoc).sort()).toEqual(Object.keys(origDoc).sort())
    for (const k of Object.keys(origDoc)) {
      expect(afterDoc[k].__type).toBe(origDoc[k].__type)
    }

    // 除目标字段外全部深等（覆盖 HistoryTime/RealTime/PlayArmyName/PlayerFlag/PlayerDay/
    // PlayerCharacters/PlayerItems/PlayerMedals/CurrentArmyRanks/PlayerBattles/…全部 43 个字段）
    for (const k of Object.keys(origDoc)) {
      if (TARGETED.has(k)) continue
      expect(afterDoc[k].value).toEqual(origDoc[k].value)
    }

    // 点名断言（防 TARGETED 集合误伤）
    expect(afterDoc.HistoryTime.value).toBe(origDoc.HistoryTime.value)
    expect(afterDoc.RealTime.value).toBe(origDoc.RealTime.value)
    expect(afterDoc.PlayArmyName.value).toBe(origDoc.PlayArmyName.value)
    expect(afterDoc.PlayerFlag.value).toBe(origDoc.PlayerFlag.value)
    expect(afterDoc.PlayerDay.value).toBe(origDoc.PlayerDay.value)
    expect(afterDoc.PlayerCharacters.value).toEqual(origDoc.PlayerCharacters.value)

    // PlayerUnits：除 exp 外逐台逐字段深等
    const a = afterDoc.PlayerUnits.value as UnitEntry[]
    const b = origDoc.PlayerUnits.value as UnitEntry[]
    expect(a).toHaveLength(b.length)
    for (let i = 0; i < a.length; i++) {
      for (const f of UNIT_UNTOUCHED) {
        expect(a[i][f]).toEqual(b[i][f])
      }
    }
  })
})

describe.skipIf(!haveCollection)('E2E 真实图鉴 collection.cf（CFSE_E2E_COLLECTION）', () => {
  it('maxCollection → 序列化 → 重载：结局全开/机体全+6/成员全Lv10', () => {
    if (!collectionPath) throw new Error('CFSE_E2E_COLLECTION 未设置')
    // collection.cf 为严格 JSON，直接走产品 loadCollectionText，无需任何规避
    const c: CollectionSnapshot = loadCollectionText(readFileSync(collectionPath, 'utf8'))
    const e0 = c.endings.length
    const u0 = c.units.length
    const m0 = c.members.length
    expect(e0).toBeGreaterThan(0)
    expect(u0).toBeGreaterThan(0)
    expect(m0).toBeGreaterThan(0)
    maxCollection(c)
    const back = loadCollectionText(serializeCollectionText(c))
    expect(back.endings).toHaveLength(e0)
    expect(back.units).toHaveLength(u0)
    expect(back.members).toHaveLength(m0)
    expect(back.endings.every(Boolean)).toBe(true)
    expect(back.units.every((v) => v === 7)).toBe(true)
    expect(back.members.every((v) => v === 10)).toBe(true)
    console.log(`[e2e] 图鉴: endings=${e0} units=${u0} members=${m0} 全部拉满`)
  })
})
})
