/**
 * Typed projection over the S_User hxbit tree: meta-progression resources,
 * blueprint/item unlocks, statistics readout, skins and Boss Rush toggles.
 * All edits go through leaf patches; untouched subtrees stay byte-identical.
 */

import {
  asArray,
  asBool,
  asInt,
  asObject,
  asString,
  asStringArray,
  encodeBool,
  encodeInt,
  encodeString,
  maxObjectUid,
  setArrayAppended,
  setBoolValue,
  setIntValue,
  setStringArray,
  setStringValue,
  type HxObject,
  type HxValue,
  type HxsDoc
} from './hxbit'
import { RUNE_ORDER } from './runes'

export interface ItemRow {
  index: number
  itemId: string
  investedCells: number
  isNew: boolean
  unlocked: boolean
}

export interface BossRushRow {
  field: string
  idx: number
  unlock: boolean
}

export interface RuneRow {
  id: string
  enabled: boolean
}

export interface DeadCellsView {
  deathMoney: number
  deathCells: number
  bossCells: number
  items: ItemRow[]
  heroSkin: string
  heroHeadSkin: string
  consecutiveCompletedRuns: number
  bossRush: BossRushRow[]
  runes: RuneRow[]
  editable: boolean
}

export const BOSS_CELL_IDS = ['BossRune1', 'BossRune2', 'BossRune3', 'BossRune4', 'BossRune5']
export const MAX_BOSS_CELLS = BOSS_CELL_IDS.length

const BOSS_RUSH_FIELDS = [
  'unlockedGameMode',
  'basementUnlock',
  'capUnlock',
  'pantUnlock',
  'skirtUnlock',
  'skullUnlock',
  'topUnlock',
  'weaponUnlock',
  'materialUnlock'
]

function intField(obj: HxObject, name: string): number {
  return asInt(obj.fields.get(name)) ?? 0
}

function stringField(obj: HxObject, name: string): string {
  return asString(obj.fields.get(name)) ?? ''
}

export function projectUser(doc: HxsDoc): DeadCellsView {
  const editable = !doc.opaque && doc.root !== null
  const root = doc.root
  const view: DeadCellsView = {
    deathMoney: 0,
    deathCells: 0,
    bossCells: 0,
    items: [],
    heroSkin: '',
    heroHeadSkin: '',
    consecutiveCompletedRuns: 0,
    bossRush: [],
    runes: [],
    editable
  }
  if (!root) return view

  view.deathMoney = intField(root, 'deathMoney')
  view.deathCells = intField(root, 'deathCells')
  view.bossCells = intField(root, 'bossRuneActivated')
  view.heroSkin = stringField(root, 'heroSkin')
  view.heroHeadSkin = stringField(root, 'heroHeadSkin')
  view.consecutiveCompletedRuns = intField(root, 'consecutiveCompletedRuns')

  const itemMeta = asObject(root.fields.get('itemMeta'))
  if (itemMeta) {
    const progress = asArray(itemMeta.fields.get('itemProgress'))
    if (progress) {
      progress.forEach((entry, index) => {
        const obj = asObject(entry)
        if (!obj) return
        view.items.push({
          index,
          itemId: stringField(obj, 'itemId'),
          investedCells: intField(obj, 'investedCells'),
          isNew: asBool(obj.fields.get('isNew')) ?? false,
          unlocked: asBool(obj.fields.get('unlocked')) ?? false
        })
      })
    }
  }

  const ownedRunes = new Set<string>()
  for (const node of metaArrayNodes(root)) {
    for (const id of asStringArray(node) ?? []) ownedRunes.add(id)
  }
  view.runes = RUNE_ORDER.map((id) => ({ id, enabled: ownedRunes.has(id) }))

  const boss = asObject(root.fields.get('bossRushData') ?? findBossRush(root))
  if (boss) {
    for (const field of BOSS_RUSH_FIELDS) {
      const arr = asArray(boss.fields.get(field))
      if (!arr) continue
      arr.forEach((entry) => {
        const obj = entry.kind === 'obj' ? entry : null
        if (!obj || obj.isNull) return
        const idx = obj.fields.get('idx')
        const unlock = obj.fields.get('unlock')
        const idxVal = idx && idx.present && idx.value ? asInt(idx.value) : null
        const unlockVal = unlock && unlock.present && unlock.value ? asBool(unlock.value) : null
        if (idxVal === null || unlockVal === null) return
        view.bossRush.push({ field, idx: idxVal, unlock: unlockVal })
      })
    }
  }
  return view
}

function findBossRush(root: HxObject): HxValue | undefined {
  // bossRushData lives on UserStats in current saves
  const userStats = asObject(root.fields.get('userStats'))
  return userStats?.fields.get('bossRushData')
}

/**
 * The save stores permanent/meta item ids in two string arrays: `metaItems` on
 * the User and `permanentItems` on the item-meta manager. Runes are read from
 * both and written to both (the exact slot is unverified across versions).
 */
function metaArrayNodes(root: HxObject): Array<Extract<HxValue, { kind: 'array' }>> {
  const nodes: Array<Extract<HxValue, { kind: 'array' }>> = []
  const metaItems = root.fields.get('metaItems')
  if (metaItems?.kind === 'array') nodes.push(metaItems)
  const itemMeta = asObject(root.fields.get('itemMeta'))
  const permanent = itemMeta?.fields.get('permanentItems')
  if (permanent?.kind === 'array') nodes.push(permanent)
  return nodes
}

function itemEntry(doc: HxsDoc, index: number): HxObject | null {
  const root = doc.root
  if (!root) return null
  const itemMeta = asObject(root.fields.get('itemMeta'))
  if (!itemMeta) return null
  const progress = asArray(itemMeta.fields.get('itemProgress'))
  if (!progress || index < 0 || index >= progress.length) return null
  return asObject(progress[index]!)
}

export function setDeathMoney(doc: HxsDoc, value: number): void {
  const node = doc.root?.fields.get('deathMoney')
  if (node?.kind === 'int') setIntValue(doc, node, value)
}

export function setDeathCells(doc: HxsDoc, value: number): void {
  const node = doc.root?.fields.get('deathCells')
  if (node?.kind === 'int') setIntValue(doc, node, value)
}

export function setItemUnlocked(doc: HxsDoc, index: number, value: boolean): void {
  const obj = itemEntry(doc, index)
  const node = obj?.fields.get('unlocked')
  if (node?.kind === 'bool') setBoolValue(doc, node, value)
}

export function setItemInvestedCells(doc: HxsDoc, index: number, value: number): void {
  const obj = itemEntry(doc, index)
  const node = obj?.fields.get('investedCells')
  if (node?.kind === 'int') setIntValue(doc, node, value)
}

export function setItemIsNew(doc: HxsDoc, index: number, value: boolean): void {
  const obj = itemEntry(doc, index)
  const node = obj?.fields.get('isNew')
  if (node?.kind === 'bool') setBoolValue(doc, node, value)
}

export function setHeroSkin(doc: HxsDoc, value: string): void {
  const node = doc.root?.fields.get('heroSkin')
  if (node?.kind === 'string') setStringValue(doc, node, value)
}

export function setHeroHeadSkin(doc: HxsDoc, value: string): void {
  const node = doc.root?.fields.get('heroHeadSkin')
  if (node?.kind === 'string') setStringValue(doc, node, value)
}

export function setRune(doc: HxsDoc, id: string, on: boolean): void {
  const root = doc.root
  if (!root) return
  for (const node of metaArrayNodes(root)) {
    const current = asStringArray(node) ?? []
    const next = on
      ? current.includes(id)
        ? current
        : [...current, id]
      : current.filter((s) => s !== id)
    setStringArray(doc, node, next)
  }
}

/** Number of Boss Stem Cells (difficulty level 0..5) recorded on the save. */
export function bossCells(doc: HxsDoc): number {
  return asInt(doc.root?.fields.get('bossRuneActivated')) ?? 0
}

/**
 * Set the Boss Stem Cell difficulty (0..5): writes `bossRuneActivated` and keeps
 * the meta item arrays in sync with the absorbed cell items (BossRune1..N).
 */
export function setBossCells(doc: HxsDoc, n: number): void {
  const root = doc.root
  if (!root) return
  const value = Math.max(0, Math.min(MAX_BOSS_CELLS, Math.round(n)))
  const node = root.fields.get('bossRuneActivated')
  if (node?.kind === 'int') setIntValue(doc, node, value)
  for (const arr of metaArrayNodes(root)) {
    const current = (asStringArray(arr) ?? []).filter((id) => !BOSS_CELL_IDS.includes(id))
    for (let i = 0; i < value; i++) current.push(BOSS_CELL_IDS[i]!)
    setStringArray(doc, arr, current)
  }
}

export function setBossRushUnlock(doc: HxsDoc, field: string, idx: number, value: boolean): void {
  const root = doc.root
  if (!root) return
  const boss = asObject(root.fields.get('bossRushData') ?? findBossRush(root))
  if (!boss) return
  const arr = asArray(boss.fields.get(field))
  if (!arr) return
  for (const entry of arr) {
    if (entry.kind !== 'obj' || entry.isNull) continue
    const idxNode = entry.fields.get('idx')
    const unlockNode = entry.fields.get('unlock')
    const idxVal = idxNode && idxNode.present && idxNode.value ? asInt(idxNode.value) : null
    if (idxVal !== idx) continue
    if (unlockNode?.present && unlockNode.value?.kind === 'bool') {
      setBoolValue(doc, unlockNode.value, value)
    }
    return
  }
}

// ------------------------------------------------------------ item unlocks

/** Item ids unlocked by this session but absent from the save, tracked per doc. */
const appendedSkins = new WeakMap<HxsDoc, Map<string, number>>()
const nextUidByDoc = new WeakMap<HxsDoc, number>()

function itemProgressNode(doc: HxsDoc): Extract<HxValue, { kind: 'array' }> | null {
  const itemMeta = asObject(doc.root?.fields.get('itemMeta'))
  const node = itemMeta?.fields.get('itemProgress')
  return node?.kind === 'array' ? node : null
}

function originalItemEntry(doc: HxsDoc, id: string): HxObject | null {
  const node = itemProgressNode(doc)
  if (!node) return null
  for (const item of node.items) {
    const obj = asObject(item)
    if (obj && asString(obj.fields.get('itemId')) === id) return obj
  }
  return null
}

function allocateUid(doc: HxsDoc): number {
  let n = nextUidByDoc.get(doc)
  if (n === undefined) n = maxObjectUid(doc) + 1
  nextUidByDoc.set(doc, n + 1)
  return n
}

/** Encode a tool.ItemProgress entry (itemId, investedCells, isNew, unlocked). */
function encodeItemProgress(uid: number, itemId: string): Uint8Array {
  const parts = [
    encodeInt(uid),
    encodeString(itemId),
    encodeInt(-2), // same sentinel as unlocked entries in real saves
    encodeBool(false),
    encodeBool(true)
  ]
  let len = 0
  for (const p of parts) len += p.length
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/** Whether an unlockable item id is unlocked (present and unlocked, or added this session). */
export function isItemUnlockedById(doc: HxsDoc, id: string): boolean {
  const entry = originalItemEntry(doc, id)
  if (entry) return asBool(entry.fields.get('unlocked')) ?? false
  return appendedSkins.get(doc)?.has(id) ?? false
}

/**
 * Unlock or relock a skin. Entries already present in `itemProgress` are toggled
 * in place; missing ones are appended as new items (and removed again on relock).
 */
export function setItemUnlockedById(doc: HxsDoc, id: string, on: boolean): void {
  const node = itemProgressNode(doc)
  if (!node) return
  const entry = originalItemEntry(doc, id)
  if (entry) {
    const unlockNode = entry.fields.get('unlocked')
    if (unlockNode?.kind === 'bool') setBoolValue(doc, unlockNode, on)
    return
  }
  let map = appendedSkins.get(doc)
  if (!map) {
    map = new Map()
    appendedSkins.set(doc, map)
  }
  if (on) {
    if (!map.has(id)) map.set(id, allocateUid(doc))
  } else {
    map.delete(id)
  }
  const items = [...map.entries()].map(([sid, uid]) => encodeItemProgress(uid, sid))
  setArrayAppended(doc, node, items)
}
