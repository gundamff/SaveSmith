import type { ActionSpec } from '@sdk/types'
import materialsJson from './catalog/materials.json'
import unlockInventoryJson from './catalog/unlock-inventory.json'
import unlockVisionsJson from './catalog/unlock-visions.json'
import {
  appendEntry,
  boolPropertyTag,
  inventoryItemBytes,
  noneTag,
  parseGvasIndex
} from './model/gvasIndex'
import {
  libraScanAll,
  refreshProjection,
  resetAllTreasureChests,
  restockAllShops,
  setArtifactActive,
  setCurrentMoney,
  setInventoryNum,
  setMapFlag,
  setVisionAwakening,
  setVisionSynchro
} from './model/saveModel'
import type { FinalFantasyResonanceState } from './parse'

const VISION_STRIDE = 248
const VISION_ID_REL = 32
const VISION_AWAKEN_REL = 80

function int32(v: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setInt32(0, v | 0, true)
  return b
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function actions(_state: FinalFantasyResonanceState): ActionSpec[] {
  return [
    { id: 'ffr.maxMoney', labelKey: 'ffr.actions.maxMoney', kind: 'button' },
    { id: 'ffr.unlockGear', labelKey: 'ffr.actions.unlockGear', kind: 'button' },
    { id: 'ffr.unlockVisions', labelKey: 'ffr.actions.unlockVisions', kind: 'button' },
    { id: 'ffr.materialsPack', labelKey: 'ffr.actions.materialsPack', kind: 'button' },
    { id: 'ffr.revealMaps', labelKey: 'ffr.actions.revealMaps', kind: 'button' },
    { id: 'ffr.libraAll', labelKey: 'ffr.actions.libraAll', kind: 'button' },
    { id: 'ffr.restockShops', labelKey: 'ffr.actions.restockShops', kind: 'button' },
    { id: 'ffr.resetChests', labelKey: 'ffr.actions.resetChests', kind: 'button' }
  ]
}

export function applyAction(state: FinalFantasyResonanceState, id: string): FinalFantasyResonanceState {
  if (id === 'ffr.maxMoney') {
    setCurrentMoney(state, 9999999)
    return state
  }
  if (id === 'ffr.unlockGear') {
    unlockGearAndConsumables(state)
    return state
  }
  if (id === 'ffr.unlockVisions') {
    unlockAllVisions(state)
    return state
  }
  if (id === 'ffr.materialsPack') {
    applyMaterialPack(state)
    return state
  }
  if (id === 'ffr.revealMaps') {
    for (const m of state.maps) {
      setMapFlag(state, m.index, 'bIsKnown', true)
      setMapFlag(state, m.index, 'bIsVisited', true)
    }
    return state
  }
  if (id === 'ffr.libraAll') {
    libraScanAll(state)
    return state
  }
  if (id === 'ffr.restockShops') {
    restockAllShops(state)
    return state
  }
  if (id === 'ffr.resetChests') {
    resetAllTreasureChests(state)
    return state
  }
  return state
}

/** Raise qty to at least `num` (0–99); append row if missing. */
export function mergeInventoryItem(state: FinalFantasyResonanceState, itemId: number, num: number): void {
  mergeInventoryItems(state, [{ id: itemId, num }])
}

/** Batch merge: one GVAS reparse for all newly appended rows. */
export function mergeInventoryItems(
  state: FinalFantasyResonanceState,
  rows: Array<{ id: number; num: number }>
): void {
  const appends: Uint8Array[] = []
  const have = new Map(state.inventory.map((r, i) => [r.itemId, i]))
  for (const row of rows) {
    const want = Math.max(0, Math.min(99, Math.trunc(row.num)))
    const existing = have.get(row.id)
    if (existing !== undefined) {
      const cur = state.inventory[existing]!.num
      if (want > cur) setInventoryNum(state, existing, want)
      continue
    }
    appends.push(inventoryItemBytes(row.id, want))
    have.set(row.id, -1)
  }
  if (appends.length === 0) return
  const data = concat(appends)
  const nextPlain = appendEntry(state.plain, state.index, 'inventory', data, 'arrays', appends.length)
  state.plain = nextPlain
  state.index = parseGvasIndex(nextPlain)
  refreshProjection(state)
}

/** Add or stack an inventory item; replaces plain/index and refreshes projection. */
export function addOrSetInventoryItem(state: FinalFantasyResonanceState, itemId: number, num: number): void {
  const clamped = Math.max(0, Math.min(99, Math.trunc(num)))
  const existing = state.inventory.findIndex((r) => r.itemId === itemId)
  if (existing >= 0) {
    setInventoryNum(state, existing, clamped)
    return
  }
  mergeInventoryItems(state, [{ id: itemId, num: clamped }])
}

/** Merge gear/consumables list derived from a community “perfect” save. */
export function unlockGearAndConsumables(state: FinalFantasyResonanceState): void {
  mergeInventoryItems(state, unlockInventoryJson as Array<{ id: number; num: number }>)
}

export function applyMaterialPack(state: FinalFantasyResonanceState): void {
  mergeInventoryItems(state, materialsJson as Array<{ id: number; num: number }>)
}

/**
 * Ensure every vision in the unlock catalog exists; clamp awaken 0–4 and fill synchro.
 * New visions are cloned from visionList[0] (fixed 248-byte stride observed on FFR saves).
 */
export function unlockAllVisions(state: FinalFantasyResonanceState): void {
  const catalog = unlockVisionsJson as Array<{ id: number; awaken: number }>
  if (state.visions.length === 0) return

  const missing = catalog.filter((row) => !state.visions.some((v) => v.id === row.id))
  if (missing.length > 0) {
    appendVisionClones(
      state,
      missing.map((row) => ({
        id: row.id,
        awaken: Math.max(0, Math.min(4, row.awaken || 4))
      }))
    )
  }

  for (const v of state.visions) {
    const want = catalog.find((c) => c.id === v.id)
    const awaken = Math.max(0, Math.min(4, want?.awaken ?? 4))
    setVisionAwakening(state, v.index, awaken)
    v.synchro.forEach((_, j) => setVisionSynchro(state, v.index, j, 9999))
  }
}

function appendVisionClones(
  state: FinalFantasyResonanceState,
  rows: Array<{ id: number; awaken: number }>
): void {
  const arr = state.index.arrays.get('visionList')
  const id0 = state.index.fields.get('visionList[0].ID')
  if (!arr || !id0 || rows.length === 0) return

  const id1 = state.index.fields.get('visionList[1].ID')
  if (id1 && id1.off - id0.off !== VISION_STRIDE) return

  const base = id0.off - VISION_ID_REL
  if (base < 0 || base + VISION_STRIDE > state.plain.length) return

  const template = state.plain.subarray(base, base + VISION_STRIDE)
  const parts: Uint8Array[] = []
  for (const row of rows) {
    const entry = new Uint8Array(VISION_STRIDE)
    entry.set(template)
    const view = new DataView(entry.buffer)
    view.setInt32(VISION_ID_REL, row.id | 0, true)
    view.setInt32(VISION_AWAKEN_REL, row.awaken | 0, true)
    parts.push(entry)
  }

  const nextPlain = appendEntry(state.plain, state.index, 'visionList', concat(parts), 'arrays', parts.length)
  state.plain = nextPlain
  state.index = parseGvasIndex(nextPlain)
  refreshProjection(state)
}

/**
 * Toggle/add artifact when `artifactList` exists.
 * Early-game saves often omit the property — callers should check `hasArtifactList`.
 */
export function setOrAddArtifact(state: FinalFantasyResonanceState, itemId: number, active: boolean): void {
  if (!state.hasArtifactList) return
  const existing = state.artifacts.find((a) => a.itemId === itemId)
  if (existing) {
    setArtifactActive(state, existing.index, active)
    return
  }
  const data = concat([int32(itemId), boolPropertyTag('IsActive', active), noneTag()])
  const nextPlain = appendEntry(state.plain, state.index, 'artifactList', data, 'maps', 1)
  state.plain = nextPlain
  state.index = parseGvasIndex(nextPlain)
  refreshProjection(state)
}
