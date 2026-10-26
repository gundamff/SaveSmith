import { ModuleError } from '@sdk/error'
import {
  catalogAddableIdsByCategory,
  isAddableCategory,
  type ItemCategory
} from '../catalog/names'
import type { BelmontsCurseState } from './types'
import { refreshViews } from './saveModel'

function playerSave(state: BelmontsCurseState): Record<string, unknown> {
  const ps = state.raw.playerSave
  if (!ps || typeof ps !== 'object' || Array.isArray(ps)) {
    throw new ModuleError('MISSING_FIELD', ['playerSave'])
  }
  return ps as Record<string, unknown>
}

function inventoryOf(ps: Record<string, unknown>): string[] {
  const inv = ps.itemsInInventory
  if (!Array.isArray(inv)) return []
  return inv.filter((x): x is string => typeof x === 'string')
}

function writeInventory(ps: Record<string, unknown>, inv: string[]): void {
  ps.itemsInInventory = inv
}

function firstOther(inv: string[], except: string): string {
  return inv.find((id) => id && id !== except) ?? ''
}

/** Append item if missing (dedupe). */
export function addItem(state: BelmontsCurseState, id: string): void {
  const trimmed = id.trim()
  if (!trimmed) return
  const ps = playerSave(state)
  const inv = inventoryOf(ps)
  if (inv.includes(trimmed)) {
    refreshViews(state)
    return
  }
  writeInventory(ps, [...inv, trimmed])
  refreshViews(state)
}

/**
 * Add every catalog id of an addable category (weapon/spell/charm/skin).
 * Returns how many new ids were appended. Clue/key/other → 0.
 */
export function addAllOfCategory(state: BelmontsCurseState, category: ItemCategory): number {
  if (!isAddableCategory(category)) return 0
  const ps = playerSave(state)
  const inv = inventoryOf(ps)
  const owned = new Set(inv)
  const toAdd = catalogAddableIdsByCategory(category).filter((id) => !owned.has(id))
  if (toAdd.length === 0) {
    refreshViews(state)
    return 0
  }
  writeInventory(ps, [...inv, ...toAdd])
  refreshViews(state)
  return toAdd.length
}

/**
 * Remove item; clear / retarget equipment that referenced it.
 * Skin prefers `Skin_MC_Base` when still owned.
 */
export function removeItem(state: BelmontsCurseState, id: string): void {
  const trimmed = id.trim()
  if (!trimmed) return
  const ps = playerSave(state)
  const inv = inventoryOf(ps).filter((x) => x !== trimmed)
  writeInventory(ps, inv)

  if (ps.equippedWeaponItem === trimmed) {
    ps.equippedWeaponItem = firstOther(inv, trimmed)
  }
  if (ps.equippedSpellItem === trimmed) {
    ps.equippedSpellItem = firstOther(inv, trimmed)
  }
  if (ps.equippedSkin === trimmed) {
    if (inv.includes('Skin_MC_Base')) ps.equippedSkin = 'Skin_MC_Base'
    else ps.equippedSkin = firstOther(inv, trimmed)
  }
  const charms = ps.equippedCharmItems
  if (Array.isArray(charms)) {
    ps.equippedCharmItems = charms.map((c) => (c === trimmed ? '' : c))
  }
  refreshViews(state)
}

export function setEquippedWeapon(state: BelmontsCurseState, id: string): void {
  const trimmed = id.trim()
  if (!trimmed) return
  const ps = playerSave(state)
  if (!inventoryOf(ps).includes(trimmed)) return
  ps.equippedWeaponItem = trimmed
  refreshViews(state)
}

export function setEquippedSpell(state: BelmontsCurseState, id: string): void {
  const trimmed = id.trim()
  if (!trimmed) return
  const ps = playerSave(state)
  if (!inventoryOf(ps).includes(trimmed)) return
  ps.equippedSpellItem = trimmed
  refreshViews(state)
}

export function setEquippedSkin(state: BelmontsCurseState, id: string): void {
  const trimmed = id.trim()
  if (!trimmed) return
  const ps = playerSave(state)
  if (!inventoryOf(ps).includes(trimmed)) return
  ps.equippedSkin = trimmed
  refreshViews(state)
}

/** Charm slot may be cleared with `""`. Non-empty IDs must be owned. */
export function setEquippedCharm(state: BelmontsCurseState, index: number, id: string): void {
  const ps = playerSave(state)
  const charms = Array.isArray(ps.equippedCharmItems)
    ? [...(ps.equippedCharmItems as unknown[])]
    : []
  while (charms.length <= index) charms.push('')
  const trimmed = id.trim()
  if (trimmed && !inventoryOf(ps).includes(trimmed)) return
  charms[index] = trimmed
  ps.equippedCharmItems = charms.map((c) => (typeof c === 'string' ? c : ''))
  refreshViews(state)
}
