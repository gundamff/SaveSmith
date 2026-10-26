import items from './items.json'
import { catalogIds } from './ready'

export type ItemCategory =
  | 'weapon'
  | 'spell'
  | 'charm'
  | 'skin'
  | 'clue'
  | 'key'
  | 'other'

export type ItemEntry = {
  zh: string
  en: string
  category?: ItemCategory
  abstract?: boolean
  deprecated?: boolean
}
type ItemsJson = Record<string, ItemEntry>

/** Categories offered in the add-item UI (policy B). */
export const ADDABLE_CATEGORIES: ReadonlySet<ItemCategory> = new Set([
  'weapon',
  'spell',
  'charm',
  'skin'
])

const catalog = items as ItemsJson

function categoryFromIdPrefix(id: string): ItemCategory {
  if (id.startsWith('Weapon')) return 'weapon'
  if (id.startsWith('Charm_')) return 'charm'
  if (id.startsWith('Skin_')) return 'skin'
  if (id.startsWith('Clue_')) return 'clue'
  return 'other'
}

export function getItemCategory(id: string): ItemCategory {
  if (!id) return 'other'
  const row = catalog[id]
  const c = row?.category
  if (
    c === 'weapon' ||
    c === 'spell' ||
    c === 'charm' ||
    c === 'skin' ||
    c === 'clue' ||
    c === 'key' ||
    c === 'other'
  ) {
    return c
  }
  return categoryFromIdPrefix(id)
}

export function isAddableCategory(cat: ItemCategory): boolean {
  return ADDABLE_CATEGORIES.has(cat)
}

/**
 * Whether an id should appear in add / add-all UIs.
 * Skips abstract ItemData, deprecated, Doppelganger variants, and placeholders.
 */
export function isAddableItemId(id: string): boolean {
  if (!id) return false
  if (!isAddableCategory(getItemCategory(id))) return false
  const row = catalog[id]
  if (row?.abstract || row?.deprecated) return false
  if (id.includes('Doppelganger')) return false
  if (id.startsWith('DEPRECATED_')) return false
  if (id === 'UniqueItemID' || id === 'DualSword') return false
  return true
}

/** All catalog ids of a category (sorted), including abstract / non-addable. */
export function catalogIdsByCategory(category: ItemCategory): string[] {
  return catalogIds().filter((id) => getItemCategory(id) === category)
}

/** Addable ids of a category (sorted). */
export function catalogAddableIdsByCategory(category: ItemCategory): string[] {
  return catalogIdsByCategory(category).filter(isAddableItemId)
}

export function lookupItemName(id: string, locale: 'zh' | 'en'): string {
  if (!id) return id
  const row = catalog[id]
  if (!row) return id
  if (locale === 'en') return row.en || id
  const zh = (row.zh ?? '').trim()
  if (zh) return zh
  return row.en || id
}

/**
 * Search catalog for add-item dropdown.
 * Default: only addable categories (weapon/spell/charm/skin). Pass `category` to narrow further.
 */
export function searchCatalogOptions(
  query: string,
  locale: 'zh' | 'en',
  limit = 80,
  category?: ItemCategory | 'all-addable'
): Array<{ id: string; label: string }> {
  const q = query.trim().toLowerCase()
  const out: Array<{ id: string; label: string }> = []
  for (const id of catalogIds()) {
    if (!isAddableItemId(id)) continue
    const cat = getItemCategory(id)
    if (category && category !== 'all-addable' && cat !== category) continue
    const name = lookupItemName(id, locale)
    if (q && !id.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) continue
    out.push({ id, label: `${name} (${id})` })
    if (out.length >= limit) break
  }
  return out
}
