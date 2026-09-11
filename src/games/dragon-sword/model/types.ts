/**
 * DragonSword save projection.
 *
 * Public format references (schema/layout only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * 64-bit instance ids and BIT_FIELD values are decimal strings (SQLite int64).
 */

export interface CurrencyRow {
  itemCid: number
  amount: number
}

export interface StackableRow {
  itemCid: number
  stackCnt: number
}

export interface CharacterRow {
  characterCid: number
  level: number
  exp: number
  ascend: number
}

export interface TeamRow {
  pageId: number
  slot1: number
  slot2: number
  slot3: number
}

export interface EquipmentRow {
  itemDbid: string
  itemCid: number
  enchantLevel: number
  exp: number
  isLock: number
  deletedDate: string
  /** Stat CIDs are projected for display; applySave never writes them. */
  mainStatCid: number
  subStatCid1: number
  subStatCid2: number
  subStatCid3: number
  subStatCid4: number
  subStatCid5: number
}

export interface CookItemRow {
  itemDbid: string
  itemCid: number
  stackCnt: number
  deletedDate: string
}

export interface SwitchRow {
  category: number
  bitField: string
}

export interface TitleRow {
  category: number
  bitField: string
  favBitField: string
}

/** Pinned from PRAGMA table_info(tb_karma) on a local temp copy. ITEM_DBID is int64. */
export interface KarmaRow {
  itemDbid: string
  itemCid: number
  isLock: number
  exp: number
  ascend: number
  transcend: number
  deletedDate: number
}

export interface CostumeRow {
  costumeDbid: string
  costumeCid: number
  equipCharacterCid: number
}

export interface VehicleRow {
  vehicleDbid: string
  vehicleCid: number
}

export interface EquipMountRow {
  characterCid: number
  vehicleDbid: string
}

export interface UserRow {
  regionCid: number
  sectionUid: string
  posX: number
  posY: number
  posZ: number
}

export interface DragonSwordState {
  relativePath: string
  salt: Uint8Array
  /** Working plaintext SQLite image from parse; serialize applies onto a clone. */
  plaintextBase: Uint8Array
  userDbid: string
  currencies: CurrencyRow[]
  stackables: StackableRow[]
  characters: CharacterRow[]
  teams: TeamRow[]
  equipment: EquipmentRow[]
  cookItems: CookItemRow[]
  switches: SwitchRow[]
  titles: TitleRow[]
  karma: KarmaRow[]
  costumes: CostumeRow[]
  vehicles: VehicleRow[]
  equipMounts: EquipMountRow[]
  user: UserRow
}
