/**
 * Unified CID → localized label lookup across derived catalog JSON.
 * Unknown CIDs render as `#12345`.
 */
import { locale as hostLocale } from '@host/i18n'
import charactersJson from './characters.json'
import currenciesJson from './currencies.json'
import recipesJson from './recipes.json'

export type CatalogLocale = 'zh' | 'en'

type LocalizedName = { zh: string; en: string }

const labelByCid = new Map<number, LocalizedName>()

function register(cid: number, name: LocalizedName): void {
  if (!labelByCid.has(cid)) labelByCid.set(cid, name)
}

for (const row of currenciesJson as { itemCid: number; name: LocalizedName }[]) {
  register(row.itemCid, row.name)
}
for (const row of charactersJson as { characterCid: number; name: LocalizedName }[]) {
  register(row.characterCid, row.name)
}
for (const row of recipesJson as { dishCid?: number; name: LocalizedName }[]) {
  if (row.dishCid != null) register(row.dishCid, row.name)
}

function pickName(name: LocalizedName, loc: CatalogLocale): string {
  return name[loc] || name.zh || name.en || ''
}

export function catalogLabel(cid: number, locale?: CatalogLocale): string {
  const loc = locale ?? (hostLocale.value === 'en' ? 'en' : 'zh')
  const name = labelByCid.get(cid)
  if (name) {
    const label = pickName(name, loc)
    if (label) return label
  }
  return `#${cid}`
}
