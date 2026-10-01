import skinsData from '../data/skins.json'
import { itemDisplayName } from './itemNames'
import type { AppLocale } from '@host/i18n'

const SKINS = skinsData as { outfits: string[]; heads: string[] }

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

export function outfitOptions(locale: AppLocale, current?: string): SkinOption[] {
  return toOptions(SKINS.outfits, locale, current)
}

export function headOptions(locale: AppLocale, current?: string): SkinOption[] {
  return toOptions(SKINS.heads, locale, current)
}
