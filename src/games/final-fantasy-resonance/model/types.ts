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

export interface FfrBestiaryEntry {
  index: number
  saveId: number
  defeatNum: number
  isAnalyzed: boolean
  /** analyzedElments map indices with current bool */
  elements: Array<{ index: number; key: string; value: boolean }>
}

export interface FfrQuestBoard {
  index: number
  questId: number
  requestId: number
  deliveries: Array<{ index: number; id: number; quantity: number }>
}

export interface FfrRequest {
  index: number
  id: number
  progressIndex: number
}

export interface FfrColosseum {
  index: number
  id: number
  clearCount: number
}

export interface FfrShopRow {
  index: number
  itemId: number
  shopId: number
  maxOrderNum: number
  currentBuyNum: number
}

export interface FfrArtifact {
  index: number
  itemId: number
  active: boolean
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
  bestiary: FfrBestiaryEntry[]
  quests: FfrQuestBoard[]
  requests: FfrRequest[]
  colosseum: FfrColosseum[]
  shops: FfrShopRow[]
  artifacts: FfrArtifact[]
  /** Story flag array length; values are not exposed for editing. */
  progressFlagCount: number
  hasArtifactList: boolean
}
