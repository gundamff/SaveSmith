/**
 * Unified CID → localized label lookup across derived catalog JSON.
 * Unknown CIDs render as `#12345`.
 *
 * Provenance: see SOURCE.md (public derived tables; zh falls back to en).
 */
import { locale as hostLocale } from '@host/i18n'
import charactersJson from './characters.json'
import currenciesJson from './currencies.json'
import labelsJson from './labels.json'
import recipesJson from './recipes.json'
import titlesJson from './titles.json'

export type CatalogLocale = 'zh' | 'en'

type LocalizedName = { zh: string; en: string }

const labelByCid = new Map<number, LocalizedName>()

function register(cid: number, name: LocalizedName): void {
  if (!Number.isFinite(cid) || cid === 0) return
  if (!name.zh && !name.en) return
  if (!labelByCid.has(cid)) labelByCid.set(cid, name)
}

for (const [cidStr, name] of Object.entries(labelsJson as Record<string, LocalizedName>)) {
  register(Number(cidStr), name)
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
for (const row of titlesJson as { titleId: number; name: LocalizedName }[]) {
  register(row.titleId, row.name)
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
