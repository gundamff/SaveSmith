import type { ActionSpec } from '@sdk/types'
import {
  appendEntry,
  inventoryItemBytes,
  parseGvasIndex
} from './model/gvasIndex'
import { refreshProjection, setCurrentMoney, setInventoryNum, setMapFlag } from './model/saveModel'
import type { FinalFantasyResonanceState } from './parse'

export function actions(_state: FinalFantasyResonanceState): ActionSpec[] {
  return [
    { id: 'ffr.maxMoney', labelKey: 'ffr.actions.maxMoney', kind: 'button' },
    { id: 'ffr.revealMaps', labelKey: 'ffr.actions.revealMaps', kind: 'button' }
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
