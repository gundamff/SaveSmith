/**
 * Cooking recipe switch keys → tb_switch category/bit.
 *
 * Public format: CATEGORY = switchKey / 64, bit = switchKey % 64.
 * https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Do not blanket BIT_FIELD = -1 on categories 0/5 (non-recipe flags).
 */
import { hasBit, setBit } from './bitmask'
import type { SwitchRow } from './types'
import recipesJson from '../catalog/recipes.json'

export interface RecipeDef {
  switchKey: number
  dishCid?: number
  name: { zh: string; en: string }
}

export const recipeCatalog: RecipeDef[] = recipesJson as RecipeDef[]

export function recipeBit(switchKey: number): { category: number; bit: number } {
  return {
    category: Math.floor(switchKey / 64),
    bit: switchKey % 64
  }
}

export function isActiveCookRow(deletedDate: string): boolean {
  return deletedDate === '0' || deletedDate === '' || Number(deletedDate) === 0
}

export function recipeKnown(switches: SwitchRow[], switchKey: number): boolean {
  const { category, bit } = recipeBit(switchKey)
  const row = switches.find((s) => s.category === category)
  return row ? hasBit(row.bitField, bit) : false
}

/** OR (unlock) or clear (lock) one recipe bit in-place. Never creates a row to lock a missing category. */
export function setRecipeKnown(switches: SwitchRow[], switchKey: number, known: boolean): void {
  const { category, bit } = recipeBit(switchKey)
  let row = switches.find((s) => s.category === category)
  if (!row) {
    if (!known) return
    row = { category, bitField: '0' }
    switches.push(row)
  }
  row.bitField = setBit(row.bitField, bit, known)
}
