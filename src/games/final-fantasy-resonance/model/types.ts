import type { GvasIndex } from './gvasIndex'

export interface FfrInventoryItem {
  itemId: number
  num: number
}

export interface FfrUnit {
  index: number
  unitId: number
  experience: number
  hitPoint: number
  magicPoint: number
  equipWeaponId: number
  equipArmorId: number
  equipVisionId: number
}

export interface FfrVision {
  index: number
  id: number
  awakeningPoint: number
  /** synchroPoints map values keyed by character/unit id */
  synchro: Array<{ key: number; value: number }>
}

export interface FfrMapEntry {
  index: number
  mapId: number
  known: boolean
  visited: boolean
  cleared: boolean
}

export interface FinalFantasyResonanceState {
  relativePath: string
  header: Uint8Array
  /** Full decrypted GVAS body (mutable). */
  plain: Uint8Array
  index: GvasIndex
  currentMoney: number
  playTime: number
  winNum: number
  inventory: FfrInventoryItem[]
  units: FfrUnit[]
  visions: FfrVision[]
  maps: FfrMapEntry[]
}
