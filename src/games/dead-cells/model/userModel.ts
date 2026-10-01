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
  items: ItemRow[]
  heroSkin: string
  heroHeadSkin: string
  consecutiveCompletedRuns: number
  bossRush: BossRushRow[]
  runes: RuneRow[]
  editable: boolean
}

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
