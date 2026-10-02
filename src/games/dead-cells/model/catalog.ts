import catalogData from '../data/catalog.json'
import { itemDisplayName } from './itemNames'
import type { AppLocale } from '@host/i18n'

const CATALOG = catalogData as {
  outfits: string[]
  heads: string[]
  unlock: Record<string, string[]>
}

export interface SkinOption {
  value: string
  label: string
}

function toOptions(ids: string[], locale: AppLocale, current?: string): SkinOption[] {
  const options = ids.map((id) => ({ value: id, label: itemDisplayName(id, locale) }))
  options.sort((a, b) => a.label.localeCompare(b.label, locale === 'zh' ? 'zh' : 'en'))
  if (current && !ids.includes(current)) {
    options.unshift({
      value: current,
      label: locale === 'zh' ? `${current}（未知）` : `${current} (unknown)`
    })
  }
  return options
}

/** Outfit dropdown options (from the game's `skin` sheet). */
export function outfitOptions(locale: AppLocale, current?: string): SkinOption[] {
  return toOptions(CATALOG.outfits, locale, current)
}

/** Head-skin dropdown options (from the game's `customHead` sheet). */
export function headOptions(locale: AppLocale, current?: string): SkinOption[] {
  return toOptions(CATALOG.heads, locale, current)
}

export const UNLOCK_CATEGORIES = ['weapons', 'mutations', 'aspects', 'skins', 'heads', 'meta'] as const
export type UnlockCategory = (typeof UNLOCK_CATEGORIES)[number] | 'all'

/** Every unlockable item id in a category (`all` spans every category). */
export function categoryIds(category: UnlockCategory): string[] {
  if (category === 'all') return UNLOCK_CATEGORIES.flatMap((c) => CATALOG.unlock[c] ?? [])
  return CATALOG.unlock[category] ?? []
}
