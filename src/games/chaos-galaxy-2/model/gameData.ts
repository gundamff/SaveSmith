import data from '../data/game-data.json'

export interface NamedEntry {
  id: number
  name: string
  info?: string
}

export interface CommanderEntry extends NamedEntry {
  portrait: number
  npc: number
  military: number
  intellect: number
  admin: number
  breeding: number
  talent: number
  strategy: number
  tactics: number
  levelUpType: number
  flagUnit: number
}

export interface UnitEntry extends NamedEntry {
  model: number
  kind: number
  type: number
  rank: number
  power: number
  energy: number
  agile: number
  move: number
  limit: number
}

export interface PlanetEntry {
  id: number
  name: string
}

export interface BuildingEntry extends NamedEntry {
  icon: number
  buildingType: number
  defenseMax: number[]
}

export interface RankEntry extends NamedEntry {
  rankType: number
  fleetLimit: number
  military: number
  intellect: number
  admin: number
}

export interface CollectionLengths {
  commanders: number
  units: number
  events: number
}

export interface CollectionCommanderEntry {
  index: number
  commanderId: number
  need: number
}

export interface CollectionUnitEntry {
  index: number
  unitId: number
  need: number
}

export interface CollectionEventEntry {
  index: number
  name: string
  info: string
}

export interface FactionEntry extends NamedEntry {
  leader: number
  factionSide: number
}

export interface ChipSkillEntry extends NamedEntry {
  chipType: number
}

export interface GameData {
  commanderMaxExp: number
  commanderMaxStar: number
  commanderMaxStat: number
  planetMaxDefense: number
  planetMaxHqLevel: number
  resourceMaxGold: number
  resourceMaxSupply: number
  resourceMaxPrestige: number
  commanders: CommanderEntry[]
  units: UnitEntry[]
  planets: PlanetEntry[]
  buildings: BuildingEntry[]
  ranks: RankEntry[]
  talents: NamedEntry[]
  strategies: NamedEntry[]
  tactics: NamedEntry[]
  abilities: NamedEntry[]
  weapons: NamedEntry[]
  factions: FactionEntry[]
  chipSkills: ChipSkillEntry[]
  levelTables: Record<string, number[]>
  collectionLengths: CollectionLengths
  collectionCommanders: CollectionCommanderEntry[]
  collectionUnits: CollectionUnitEntry[]
  collectionEvents: CollectionEventEntry[]
}

/** Extracted catalog from scripts/extract-chaos-galaxy-2.mjs */
export const gameData = data as GameData

export function commanderById(gd: GameData, id: number): CommanderEntry | undefined {
  return gd.commanders.find((c) => c.id === id)
}

export function unitById(gd: GameData, id: number): UnitEntry | undefined {
  return gd.units.find((u) => u.id === id)
}

/** Empty/sentinel 0 is allowed; any other id must exist in the unit catalog. */
export function isKnownUnitTypeId(gd: GameData, id: number): boolean {
  return id === 0 || unitById(gd, id) != null
}

export function planetById(gd: GameData, id: number): PlanetEntry | undefined {
  return gd.planets.find((p) => p.id === id)
}

export function buildingById(gd: GameData, id: number): BuildingEntry | undefined {
  return gd.buildings.find((b) => b.id === id)
}

export function factionById(gd: GameData, id: number): FactionEntry | undefined {
  return gd.factions.find((f) => f.id === id)
}

/** Display label for a faction id (includes #id for disambiguation). */
export function factionLabel(gd: GameData, id: number, fallbackPrefix = '势力'): string {
  const name = factionById(gd, id)?.name
  return name ? `${name} (#${id})` : `${fallbackPrefix}#${id}`
}

export function factionOptions(gd: GameData): { value: number; label: string }[] {
  return gd.factions
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((f) => ({ value: f.id, label: `${f.name} (#${f.id})` }))
}

export function chipSkillById(gd: GameData, id: number): ChipSkillEntry | undefined {
  return gd.chipSkills.find((c) => c.id === id)
}

export function chipSkillLabel(gd: GameData, id: number): string {
  if (id === 0) return ''
  const name = chipSkillById(gd, id)?.name
  return name ? `${name} (#${id})` : `#${id}`
}

export function chipSkillOptions(gd: GameData): { value: number; label: string }[] {
  return [
    { value: 0, label: '—' },
    ...gd.chipSkills
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((c) => ({ value: c.id, label: `${c.name} (#${c.id})` }))
  ]
}
