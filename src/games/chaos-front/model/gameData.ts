import data from '../data/game-data.json'
import { UNIT_MAX_LEVEL } from './level'

export interface UnitTypeEntry {
  id: number
  name: string
  info?: string
  kind: number
  size: number
  levelType: number
  model: number
  hp?: number
  en?: number
  agility?: number
  limit?: number
  move?: number
  hangarS?: number
  hangarL?: number
  weapon1?: number
  weapon2?: number
  shield?: number
  ability1?: number
  ability2?: number
  ability3?: number
}
export interface CharacterEntry {
  id: number
  name: string
  info?: string
  portrait: number
  joinLv?: number
  shoot?: number
  maneuver?: number
  command?: number
  sp?: number
  melee?: number
  reaction?: number
  talents?: number[]
  skills?: number[]
}
export interface ItemEntry {
  id: number
  name: string
  info?: string
  icon: number
}

export interface ArmyEntry {
  id: number
  name: string
  flag: number
}

export interface PlanetEntry {
  id: number
  name: string
}

export interface SkillEntry {
  id: number
  name: string
  info: string
  type: number
  sp: number
}

export interface TalentEntry {
  id: number
  name: string
  infos: string[]
}

export interface AbilityEntry {
  id: number
  name: string
  info: string
  icon: number
  type: number
  en: number
  range: number
}

export interface WeaponEntry {
  id: number
  name: string
  info: string
  icon: number
  en: number
  damage: number
  hit: number
  rangeMin: number
  rangeMax: number
  count: number
}

export interface GameData {
  unitTypes: UnitTypeEntry[]
  characters: CharacterEntry[]
  items: ItemEntry[]
  armies: ArmyEntry[]
  planets: PlanetEntry[]
  levelTables: Record<string, number[]>
  unitMaxExp: Record<string, number>
  skills: SkillEntry[]
  talents: TalentEntry[]
  abilities: AbilityEntry[]
  weapons: WeaponEntry[]
}

/** 提取脚本产物（见 scripts/extract-game-data.mjs） */
export const gameData = data as GameData

export const ALL_UNIT_TYPE_IDS: number[] = gameData.unitTypes.map((u) => u.id)

export function unitTypeById(gd: GameData, id: number): UnitTypeEntry | undefined {
  return gd.unitTypes.find((u) => u.id === id)
}

export function characterById(gd: GameData, id: number): CharacterEntry | undefined {
  return gd.characters.find((c) => c.id === id)
}

export function itemById(gd: GameData, id: number): ItemEntry | undefined {
  return gd.items.find((i) => i.id === id)
}

export function armyById(gd: GameData, id: number): ArmyEntry | undefined {
  return gd.armies.find((a) => a.id === id)
}

export function planetById(gd: GameData, id: number): PlanetEntry | undefined {
  return gd.planets.find((p) => p.id === id)
}

export function skillById(gd: GameData, id: number): SkillEntry | undefined {
  return gd.skills.find((s) => s.id === id)
}

export function talentById(gd: GameData, id: number): TalentEntry | undefined {
  return gd.talents.find((t) => t.id === id)
}

export function abilityById(gd: GameData, id: number): AbilityEntry | undefined {
  return gd.abilities.find((a) => a.id === id)
}

export function weaponById(gd: GameData, id: number): WeaponEntry | undefined {
  return gd.weapons.find((w) => w.id === id)
}

export function levelTableOf(gd: GameData, levelType: number): number[] {
  return gd.levelTables[String(levelType)] ?? [0, 0, 0, 0, 0, 0, 0]
}

/** 机体经验上限：unitMaxExp 表优先；表外机型回落到各等级表 EXP6 的最大值（真实数据下即 UNIT_EXP6_FALLBACK） */
export function unitMaxExpOf(gd: GameData, unitTypeId: number): number {
  const v = gd.unitMaxExp[String(unitTypeId)]
  if (v !== undefined) return v
  let max = 0
  for (const table of Object.values(gd.levelTables)) {
    const exp6 = table[UNIT_MAX_LEVEL]
    if (typeof exp6 === 'number' && exp6 > max) max = exp6
  }
  return max
}
