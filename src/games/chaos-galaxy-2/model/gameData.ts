import data from '../data/game-data.json'

export interface GameData {
  commanderMaxExp: number
  commanderMaxStar: number
  commanderMaxStat: number
  planetMaxDefense: number
  planetMaxHqLevel: number
  resourceMaxGold: number
  resourceMaxSupply: number
  resourceMaxPrestige: number
  commanders: unknown[]
  units: unknown[]
  levelTables: Record<string, number[]>
}

/** Stub caps until Task 5 extract replaces this JSON. */
export const gameData = data as GameData
