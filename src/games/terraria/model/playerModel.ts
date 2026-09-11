import { ModuleError } from '@sdk/error'
import { BinReader, BinWriter } from './binary'

export interface ItemStack {
  id: number
  stack: number
  prefix: number
  favorited: boolean
}

export interface EquipSlot {
  id: number
  prefix: number
  flag: number
}

export interface Money {
  platinum: number
  gold: number
  silver: number
  copper: number
}

/** Coin item IDs: copper, silver, gold, platinum */
export const COIN_IDS = [71, 72, 73, 74] as const

export interface TerrariaPlayerState {
  relativePath: string
  version: number
  name: string
  difficulty: number
  /** Bytes after difficulty through byte before life (exclusive of life). */
  preStats: Uint8Array
  statLife: number
  statLifeMax: number
  statMana: number
  statManaMax: number
  /** Flags + tax + deaths + 7 colors (version-dependent length, preserved). */
  postStats: Uint8Array
  armor: EquipSlot[]
  dyes: EquipSlot[]
  inventory: ItemStack[]
  coins: ItemStack[]
  ammo: ItemStack[]
  tail: Uint8Array
  /** FileMetadata + favorite before name */
  header: Uint8Array
}

const MIN_VERSION = 230
const MAX_VERSION = 400
const PLAYER_FILE_TYPE = 3
const ARMOR_SLOTS = 20
const DYE_SLOTS = 10
const INV_SLOTS = 50
const COIN_SLOTS = 4
const AMMO_SLOTS = 4

function readEquip(r: BinReader): EquipSlot {
  return { id: r.i32(), prefix: r.u8(), flag: r.u8() }
}

function writeEquip(w: BinWriter, e: EquipSlot): void {
  w.i32(e.id)
  w.u8(e.prefix)
  w.u8(e.flag)
}

function readStack(r: BinReader): ItemStack {
  return { id: r.i32(), stack: r.i32(), prefix: r.u8(), favorited: r.bool() }
}

function writeStack(w: BinWriter, s: ItemStack): void {
  w.i32(s.id)
  w.i32(s.stack)
  w.u8(s.prefix)
  w.bool(s.favorited)
}

function emptyStack(): ItemStack {
  return { id: 0, stack: 0, prefix: 0, favorited: false }
}

/** Length of post-stat opaque region for supported 1.4.x versions (through colors). */
function postStatsLength(version: number): number {
  // 12 bool flags + tax i32 + 2× death i32 + 7× RGB — verified on v326 fixture
  if (version >= 260) return 12 + 4 + 8 + 21
  if (version >= 254) return 11 + 4 + 8 + 21
  throw new ModuleError('UNSUPPORTED_VERSION', [version])
}

export function parsePlayer(plain: Uint8Array, relativePath: string): TerrariaPlayerState {
  const r = new BinReader(plain)
  const version = r.i32()
  if (version < MIN_VERSION || version > MAX_VERSION) {
    throw new ModuleError('UNSUPPORTED_VERSION', [version])
  }
  const magic = String.fromCharCode(...r.slice(7))
  if (magic !== 'relogic') throw new ModuleError('PARSE_FAILED', ['magic'])
  const fileType = r.u8()
  if (fileType !== PLAYER_FILE_TYPE) throw new ModuleError('PARSE_FAILED', ['fileType', fileType])
  r.i32() // revision
  r.i64bytes() // favorite
  const header = plain.subarray(0, r.o)

  const name = r.string()
  const difficulty = r.u8()
  const preStatsStart = r.o
  // playtime i64, hair i32, hairDye u8, [team u8 if >=283], hide u16, misc u8, style u8
  r.i64bytes()
  r.i32()
  r.u8()
  if (version >= 283) r.u8()
  r.u16()
  r.u8()
  r.u8()
  const preStats = plain.subarray(preStatsStart, r.o)

  const statLife = r.i32()
  const statLifeMax = r.i32()
  const statMana = r.i32()
  const statManaMax = r.i32()
  const postStats = r.slice(postStatsLength(version))

  const armor: EquipSlot[] = []
  for (let i = 0; i < ARMOR_SLOTS; i++) armor.push(readEquip(r))
  const dyes: EquipSlot[] = []
  for (let i = 0; i < DYE_SLOTS; i++) dyes.push(readEquip(r))
  const inventory: ItemStack[] = []
  for (let i = 0; i < INV_SLOTS; i++) inventory.push(readStack(r))
  const coins: ItemStack[] = []
  for (let i = 0; i < COIN_SLOTS; i++) coins.push(readStack(r))
  const ammo: ItemStack[] = []
  for (let i = 0; i < AMMO_SLOTS; i++) ammo.push(readStack(r))
  const tail = r.rest()

  return {
    relativePath,
    version,
    name,
    difficulty,
    preStats,
    statLife,
    statLifeMax,
    statMana,
    statManaMax,
    postStats,
    armor,
    dyes,
    inventory,
    coins,
    ammo,
    tail,
    header
  }
}

export function serializePlayer(state: TerrariaPlayerState): Uint8Array {
  const w = new BinWriter()
  // Rebuild header from fields so name length changes stay consistent
  w.i32(state.version)
  w.bytes(new TextEncoder().encode('relogic'))
  // header after magic: fileType, revision, favorite — take from stored header
  // header layout: version(4)+magic(7)+type(1)+rev(4)+fav(8) = 24
  if (state.header.length < 24) throw new ModuleError('SERIALIZE_FAILED', ['header'])
  w.u8(state.header[11]!)
  w.bytes(state.header.subarray(12, 24))
  w.string(state.name)
  w.u8(state.difficulty)
  w.bytes(state.preStats)
  w.i32(state.statLife)
  w.i32(state.statLifeMax)
  w.i32(state.statMana)
  w.i32(state.statManaMax)
  w.bytes(state.postStats)
  for (const e of state.armor) writeEquip(w, e)
  for (const e of state.dyes) writeEquip(w, e)
  for (const s of state.inventory) writeStack(w, s)
  for (const s of state.coins) writeStack(w, s)
  for (const s of state.ammo) writeStack(w, s)
  w.bytes(state.tail)
  return w.toUint8Array()
}

export function moneyFromState(state: TerrariaPlayerState): Money {
  const counts = [0, 0, 0, 0]
  const add = (slot: ItemStack) => {
    const idx = COIN_IDS.indexOf(slot.id as (typeof COIN_IDS)[number])
    if (idx >= 0 && slot.stack > 0) counts[idx]! += slot.stack
  }
  for (const s of state.coins) add(s)
  for (const s of state.inventory) add(s)
  return {
    copper: counts[0]!,
    silver: counts[1]!,
    gold: counts[2]!,
    platinum: counts[3]!
  }
}

/** Write money into the 4 dedicated coin slots; clear coin stacks from main inventory. */
export function applyMoney(state: TerrariaPlayerState, money: Money): void {
  const amounts = [
    Math.max(0, Math.floor(money.copper)),
    Math.max(0, Math.floor(money.silver)),
    Math.max(0, Math.floor(money.gold)),
    Math.max(0, Math.floor(money.platinum))
  ]
  for (const s of state.inventory) {
    if ((COIN_IDS as readonly number[]).includes(s.id)) {
      s.id = 0
      s.stack = 0
      s.prefix = 0
      s.favorited = false
    }
  }
  for (let i = 0; i < COIN_SLOTS; i++) {
    const stack = amounts[i]!
    state.coins[i] = stack > 0 ? { id: COIN_IDS[i]!, stack, prefix: 0, favorited: false } : emptyStack()
  }
}
