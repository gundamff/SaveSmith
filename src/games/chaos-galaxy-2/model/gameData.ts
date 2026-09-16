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
  levelTables: Record<string, number[]>
  collectionLengths: CollectionLengths
  collectionCommanders: CollectionCommanderEntry[]
  collectionUnits: CollectionUnitEntry[]
  collectionEvents: CollectionEventEntry[]
}

/** Extracted catalog from scripts/extract-chaos-galaxy-2.mjs */
export const gameData = data as GameData
