import itemNames from '../data/item-names.json'
import type { AppLocale } from '@host/i18n'

export interface ItemNameEntry {
  en: string
  zh?: string
}

const NAMES = itemNames as Record<string, ItemNameEntry>

/** Localized blueprint/item display name, falling back to the raw game id. */
export function itemDisplayName(id: string, locale: AppLocale): string {
  const entry = NAMES[id]
  if (!entry) return id
  if (locale === 'zh') return entry.zh ?? entry.en
  return entry.en
}

/** Whether the displayed name is a real translation (vs. the raw id). */
export function hasItemName(id: string): boolean {
  return id in NAMES
}
