import { ModuleError as SaveError } from '@sdk/error'
import {
  UNLOCKABLE_UNIT_TYPE_IDS,
  unlockableItems,
  armyById,
  isUnusedEntry,
  levelTableOf,
  unitMaxExpOf,
  unitTypeById,
  type GameData
} from './gameData'
import {
  formatHistoryTime,
  playerDayFromYmd,
  ymdFromPlayerDay,
  type HistoryYmd
} from './calendar'
import { CHARACTER_MAX_EXP, unitLevelForExp } from './level'
import { getField, parseEs3, setField, stringifyEs3, type Es3Doc } from './es3'

export interface UnitEntry {
  unitType: number
  armyId: number
  characterId: number
  items: number[]
  custom: number
  number: number[]
  exp: number
  playerName: string
}

export interface PlanetState {
  id: number
  name: number
  info: number
  faction: number
  icon: number
  site: number
  mapColor: number
  economics: number
  economicsMax: number
  industry: number
  industryMax: number
  defense: number
  defenseMax: number
  stability: number
  stabilityMax: number
  buildings: number[]
  neighbors: number[]
}

export interface FactionState {
  id: number
  army: number
  leader: number
  spyMaster: number
  isActive: boolean
  capital: number
  allies: number[]
  planets: number[]
  enemyFactions: number[]
  commanders: number[]
  funds: number
  power: number
  shipModel: number
  proposalAction: number[]
  chats: unknown[]
  checkChats: boolean
}

export type PlanetStatKey = 'economics' | 'industry' | 'defense' | 'stability'

/** 编队网格：存档 row 为 1..FORMATIONATION_ROWS，col 为 0..FORMATIONATION_COLS-1；[0,0] 表示未上阵 */
export const FORMATION_ROWS = 4
export const FORMATION_COLS = 6

/** 战舰 kind=1：4 槽；机体等：2 槽 */
export const SHIP_ITEM_SLOTS = 4
export const MECH_ITEM_SLOTS = 2

export function itemSlotsForUnitType(gd: GameData, unitTypeId: number): number {
  return unitTypeById(gd, unitTypeId)?.kind === 1 ? SHIP_ITEM_SLOTS : MECH_ITEM_SLOTS
}

const REQUIRED_KEYS = [
  'PlayerUnits',
  'PlayerCharacters',
  'PlayerArmyId',
  'PlayerCredit',
  'PlayerPrestige',
  'PlayerStar',
  'PlayerMedals',
  'PlayerRelationships',
  'PlanetData',
  'FactionData',
  'PlayerItems',
  'PlayerCharacterEXPs',
  'PlayerUnlockedUnitTypes',
  'PlayerUnlockedItems'
] as const

export class SaveData {
  readonly doc: Es3Doc

  private constructor(doc: Es3Doc) {
    this.doc = doc
  }

  static load(text: string): SaveData {
    const doc = parseEs3(text)
    for (const key of REQUIRED_KEYS) {
      if (!doc[key]) throw new SaveError('MISSING_FIELD', [key])
    }
    return new SaveData(doc)
  }

  /** 已上阵机体必须有驾驶员，否则游戏会崩溃 */
  assertDeployedHavePilots(): void {
    const bad = this.units
      .map((u, i) => ({ u, i }))
      .filter(({ u }) => !this.isUndeployed(u) && !(u.characterId > 0))
    if (bad.length > 0) {
      throw new SaveError(
        'DEPLOYED_NO_PILOT',
        [bad.map(({ i }) => i).join(',')]
      )
    }
  }

  serialize(): string {
    this.assertDeployedHavePilots()
    return stringifyEs3(this.doc)
  }

  private num(key: string): number {
    return getField<number>(this.doc, key)
  }

  private setNum(key: string, v: number): void {
    setField(this.doc, key, Math.round(v))
  }

  get armyId(): number {
    return this.num('PlayerArmyId')
  }

  get armyName(): string {
    return getField<string>(this.doc, 'PlayArmyName')
  }

  get leaderName(): string {
    return getField<string>(this.doc, 'PlayerLeaderName')
  }

  get day(): number {
    return this.num('PlayerDay')
  }

  get historyTime(): string {
    return getField<string>(this.doc, 'HistoryTime')
  }

  get historyDate(): HistoryYmd {
    return ymdFromPlayerDay(this.day)
  }

  /** 同步写入 PlayerDay 与 HistoryTime；不改 RealTime */
  setHistoryDate(year: number, month: number, day: number): void {
    const y = Math.min(999, Math.max(1, Math.round(year)))
    const m = Math.min(12, Math.max(1, Math.round(month)))
    const d = Math.min(30, Math.max(1, Math.round(day)))
    this.setNum('PlayerDay', playerDayFromYmd(y, m, d))
    setField(this.doc, 'HistoryTime', formatHistoryTime(y, m, d))
  }

  get saveTime(): string {
    return getField<string>(this.doc, 'RealTime')
  }

  get flag(): number {
    return this.num('PlayerFlag')
  }

  get star(): number {
    return this.num('PlayerStar')
  }

  setStar(v: number): void {
    this.setNum('PlayerStar', v)
  }

  get credit(): number {
    return this.num('PlayerCredit')
  }

  setCredit(v: number): void {
    this.setNum('PlayerCredit', v)
  }

  get prestige(): number {
    return this.num('PlayerPrestige')
  }

  setPrestige(v: number): void {
    this.setNum('PlayerPrestige', v)
  }

  get medals(): number[] {
    return getField<number[]>(this.doc, 'PlayerMedals')
  }

  setMedal(i: number, v: number): void {
    this.medals[i] = Math.round(v)
  }

  get relationships(): number[] {
    return getField<number[]>(this.doc, 'PlayerRelationships')
  }

  setRelationship(i: number, v: number): void {
    this.relationships[i] = Math.round(v)
  }

  /** 勋章/关系下标 i ↔ FactionData.id === i+1 的军团显示名 */
  factionLabel(gd: GameData, index: number): string {
    const factionId = index + 1
    const faction = this.factions.find((f) => f.id === factionId)
    if (!faction) return `势力${factionId}`
    return armyById(gd, faction.army)?.name ?? `军团${faction.army}`
  }

  get factions(): FactionState[] {
    return getField<FactionState[]>(this.doc, 'FactionData')
  }

  get planets(): PlanetState[] {
    return getField<PlanetState[]>(this.doc, 'PlanetData')
  }

  setPlanetStat(index: number, key: PlanetStatKey, value: number): void {
    const p = this.planets[index]
    if (!p) return
    const maxKey = `${key}Max` as `${PlanetStatKey}Max`
    const max = p[maxKey]
    p[key] = Math.max(0, Math.min(Math.round(value), max))
  }

  setPlanetMax(index: number, key: PlanetStatKey, value: number): void {
    const p = this.planets[index]
    if (!p) return
    const maxKey = `${key}Max` as `${PlanetStatKey}Max`
    const next = Math.max(0, Math.round(value))
    p[maxKey] = next
    if (p[key] > next) p[key] = next
  }

  /** 修改星球归属，并同步各势力 FactionData.planets */
  setPlanetFaction(index: number, factionId: number): void {
    const p = this.planets[index]
    if (!p) return
    const planetId = p.id
    const from = p.faction
    if (from === factionId) return
    p.faction = factionId
    for (const f of this.factions) {
      f.planets = f.planets.filter((id) => id !== planetId)
      if (f.id === factionId && !f.planets.includes(planetId)) {
        f.planets.push(planetId)
      }
    }
  }

  docPlayerItems(): number[] {
    return getField<number[]>(this.doc, 'PlayerItems')
  }

  /** 仓库中某道具数量（itemId 1-based） */
  inventoryCount(itemId: number): number {
    if (itemId <= 0) return 0
    return this.docPlayerItems()[itemId - 1] ?? 0
  }

  /** 从仓库装到机体；满槽或库存不足则拒绝。战舰 4 槽、机体 2 槽。 */
  equipItem(unitIndex: number, itemId: number, gd: GameData): void {
    const u = this.units[unitIndex]
    if (!u) throw new SaveError('UNIT_INDEX', [unitIndex])
    const id = Math.round(itemId)
    if (id <= 0) throw new SaveError('ITEM_ID', [itemId])
    if (!u.items) u.items = []
    const cap = itemSlotsForUnitType(gd, u.unitType)
    if (u.items.filter((x) => x > 0).length >= cap) {
      throw new SaveError('ITEM_FULL', [cap])
    }
    const stock = this.docPlayerItems()
    const idx = id - 1
    if ((stock[idx] ?? 0) <= 0) throw new SaveError('ITEM_EMPTY', [id])
    stock[idx] = (stock[idx] ?? 0) - 1
    u.items.push(id)
  }

  /** 卸下机体 items[slot] 归还仓库 */
  unequipItem(unitIndex: number, slot: number): void {
    const u = this.units[unitIndex]
    if (!u) throw new SaveError('UNIT_INDEX', [unitIndex])
    if (!u.items || slot < 0 || slot >= u.items.length) throw new SaveError('ITEM_SLOT', [slot])
    const id = u.items[slot]
    if (!(id > 0)) {
      u.items.splice(slot, 1)
      return
    }
    const stock = this.docPlayerItems()
    stock[id - 1] = (stock[id - 1] ?? 0) + 1
    u.items.splice(slot, 1)
  }

  get units(): UnitEntry[] {
    return getField<UnitEntry[]>(this.doc, 'PlayerUnits')
  }

  isUndeployed(u: UnitEntry): boolean {
    const n = u.number ?? [0, 0]
    return n[0] === 0 && n[1] === 0
  }

  /** 存档坐标 row∈[1,FORMATIONATION_ROWS]、col∈[0,FORMATIONATION_COLS)；未找到返回 -1 */
  unitAt(row: number, col: number): number {
    return this.units.findIndex((u) => !this.isUndeployed(u) && u.number[0] === row && u.number[1] === col)
  }

  private assertFormationSlot(row: number, col: number): void {
    if (row < 1 || row > FORMATION_ROWS || col < 0 || col >= FORMATION_COLS) {
      throw new SaveError('FORMATION_OUT_OF_RANGE', [row, col, FORMATION_ROWS, FORMATION_COLS - 1])
    }
  }

  /** 将机体部署到格子；目标已有机体则交换站位（含与未上阵交换）。允许暂无驾驶员，写入存档前由 serialize 校验。 */
  deployUnit(unitIndex: number, row: number, col: number): void {
    this.assertFormationSlot(row, col)
    const units = this.units
    const u = units[unitIndex]
    if (!u) throw new SaveError('UNIT_INDEX', [unitIndex])
    const other = this.unitAt(row, col)
    const from = [...(u.number ?? [0, 0])]
    if (other === unitIndex) return
    if (other >= 0) {
      units[other].number = from
    }
    u.number = [row, col]
  }

  undeployUnit(unitIndex: number): void {
    const u = this.units[unitIndex]
    if (!u) throw new SaveError('UNIT_INDEX', [unitIndex])
    u.number = [0, 0]
  }

  /** 分配驾驶员；characterId>0 且已被其他机体占用则拒绝；已上阵不可清空驾驶员 */
  setUnitPilot(unitIndex: number, characterId: number): void {
    const units = this.units
    const u = units[unitIndex]
    if (!u) throw new SaveError('UNIT_INDEX', [unitIndex])
    const cid = Math.max(0, Math.round(characterId))
    if (cid > 0) {
      const taken = units.findIndex((x, i) => i !== unitIndex && x.characterId === cid)
      if (taken >= 0) throw new SaveError('PILOT_TAKEN', [taken])
    } else if (!this.isUndeployed(u)) {
      throw new SaveError('DEPLOYED_NO_PILOT', [unitIndex])
    }
    u.characterId = cid
  }

  setUnitExp(index: number, exp: number): void {
    this.units[index].exp = Math.max(0, Math.round(exp))
  }

  /** 全部机体拉满（按各机型 unitMaxExp），返回修改台数 */
  maxAllUnits(gd: GameData): number {
    let n = 0
    for (const u of this.units) {
      const target = unitMaxExpOf(gd, u.unitType)
      if (u.exp !== target) {
        u.exp = target
        n++
      }
    }
    return n
  }

  unitLevelOf(gd: GameData, unit: UnitEntry): number {
    const t = unitTypeById(gd, unit.unitType)
    return unitLevelForExp(unit.exp, levelTableOf(gd, t?.levelType ?? 12))
  }

  /** 删除机体并归还装备（模仿游戏 Unit.Remove） */
  removeUnit(index: number): void {
    const u = this.units[index]
    if (!u) return
    const items = this.docPlayerItems()
    for (const it of u.items ?? []) {
      if (it > 0) items[it - 1] = (items[it - 1] ?? 0) + 1
    }
    this.units.splice(index, 1)
  }

  /** 新增机体；level 0..6 */
  addUnit(gd: GameData, unitTypeId: number, level: number): UnitEntry {
    const table = levelTableOf(gd, unitTypeById(gd, unitTypeId)?.levelType ?? 12)
    const lv = Math.min(Math.max(level, 0), 6)
    const u: UnitEntry = {
      unitType: unitTypeId,
      armyId: this.armyId,
      characterId: 0,
      items: [],
      custom: 0,
      number: [0, 0],
      exp: lv === 0 ? 0 : table[lv],
      playerName: ''
    }
    this.units.push(u)
    return u
  }

  get characters(): number[] {
    return getField<number[]>(this.doc, 'PlayerCharacters')
  }

  get characterExps(): number[] {
    return getField<number[]>(this.doc, 'PlayerCharacterEXPs')
  }

  setPilotExp(index: number, exp: number): void {
    this.characterExps[index] = Math.max(0, Math.round(exp))
  }

  /** 全部驾驶员满级，返回修改人数 */
  maxAllPilots(): number {
    let n = 0
    const exps = this.characterExps
    for (let i = 0; i < exps.length; i++) {
      if (exps[i] < CHARACTER_MAX_EXP) {
        exps[i] = CHARACTER_MAX_EXP
        n++
      }
    }
    return n
  }

  get unlockedUnitTypes(): number[] {
    return getField<number[]>(this.doc, 'PlayerUnlockedUnitTypes')
  }

  setUnlockedUnitTypes(ids: number[]): void {
    setField(this.doc, 'PlayerUnlockedUnitTypes', [...ids])
  }

  unlockAllUnitTypes(): void {
    this.setUnlockedUnitTypes([...UNLOCKABLE_UNIT_TYPE_IDS])
  }

  /** Drop placeholder unit types that crash the game if left unlocked. */
  sanitizeUnlockedUnitTypes(gd: GameData): number {
    const next = this.unlockedUnitTypes.filter((id) => {
      const u = unitTypeById(gd, id)
      return u != null && !isUnusedEntry(u)
    })
    const removed = this.unlockedUnitTypes.length - next.length
    if (removed > 0) this.setUnlockedUnitTypes(next)
    return removed
  }

  get unlockedItems(): number[] {
    return getField<number[]>(this.doc, 'PlayerUnlockedItems')
  }

  setUnlockedItems(ids: number[]): void {
    setField(this.doc, 'PlayerUnlockedItems', [...ids])
  }

  unlockAllItems(gd: GameData): void {
    this.setUnlockedItems(unlockableItems(gd).map((i) => i.id))
  }
}

export interface CollectionSnapshot {
  endings: boolean[]
  units: number[]
  members: number[]
}

export function loadCollectionText(text: string): CollectionSnapshot {
  const doc = parseEs3(text)
  return {
    endings: getField<boolean[]>(doc, 'Endings'),
    units: getField<number[]>(doc, 'Units'),
    members: getField<number[]>(doc, 'Members')
  }
}

/** 结局全开；机体收藏=7(+6)；成员收藏=10(Lv10) */
export function maxCollection(c: CollectionSnapshot): void {
  for (let i = 0; i < c.endings.length; i++) c.endings[i] = true
  for (let i = 0; i < c.units.length; i++) c.units[i] = 7
  for (let i = 0; i < c.members.length; i++) c.members[i] = 10
}

export function serializeCollectionText(c: CollectionSnapshot): string {
  const doc: Es3Doc = {
    Endings: { __type: 'System.Boolean[],mscorlib', value: c.endings },
    Units: { __type: 'System.Int32[],mscorlib', value: c.units },
    Members: { __type: 'System.Int32[],mscorlib', value: c.members }
  }
  return stringifyEs3(doc)
}
