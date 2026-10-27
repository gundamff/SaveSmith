import type { ActionSpec } from '@sdk/types'
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
  setMapFlag
} from './model/saveModel'
import type { FinalFantasyResonanceState } from './parse'

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

/** Add or stack an inventory item; replaces plain/index and refreshes projection. */
export function addOrSetInventoryItem(state: FinalFantasyResonanceState, itemId: number, num: number): void {
  const clamped = Math.max(0, Math.min(99, Math.trunc(num)))
  const existing = state.inventory.findIndex((r) => r.itemId === itemId)
  if (existing >= 0) {
    setInventoryNum(state, existing, clamped)
    return
  }
  const data = inventoryItemBytes(itemId, clamped)
  const nextPlain = appendEntry(state.plain, state.index, 'inventory', data, 'arrays', 1)
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
