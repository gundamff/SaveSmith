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
  setBoolValue,
  setIntValue,
  setStringValue,
  type HxObject,
  type HxValue,
  type HxsDoc
} from './hxbit'

export interface ItemRow {
  index: number
  itemId: string
  investedCells: number
  isNew: boolean
  unlocked: boolean
}

export interface StatRow {
  key: string
  value: number
}

export interface BossRushRow {
  field: string
  idx: number
  unlock: boolean
}

export interface DeadCellsView {
  deathMoney: number
  deathCells: number
  items: ItemRow[]
  stats: StatRow[]
  heroSkin: string
  heroHeadSkin: string
  consecutiveCompletedRuns: number
  bossRush: BossRushRow[]
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
    stats: [],
    heroSkin: '',
    heroHeadSkin: '',
    consecutiveCompletedRuns: 0,
    bossRush: [],
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

  const userStats = asObject(root.fields.get('userStats'))
  if (userStats) {
    for (const [key, value] of userStats.fields) {
      const n = asInt(value)
      if (n !== null) view.stats.push({ key, value: n })
    }
  }

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
