import items from './items.json'
import { catalogIds } from './ready'

type ItemEntry = { zh: string; en: string }
type ItemsJson = Record<string, ItemEntry>

const catalog = items as ItemsJson

export function lookupItemName(id: string, locale: 'zh' | 'en'): string {
  if (!id) return id
  const row = catalog[id]
  if (!row) return id
  if (locale === 'en') return row.en || id
  const zh = (row.zh ?? '').trim()
  if (zh) return zh
  return row.en || id
}

/** Search catalog for add-item dropdown; capped to avoid mounting huge option lists. */
export function searchCatalogOptions(
  query: string,
  locale: 'zh' | 'en',
  limit = 80
): Array<{ id: string; label: string }> {
  const q = query.trim().toLowerCase()
  const out: Array<{ id: string; label: string }> = []
  for (const id of catalogIds()) {
    const name = lookupItemName(id, locale)
    if (q && !id.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) continue
    out.push({ id, label: `${name} (${id})` })
    if (out.length >= limit) break
  }
  return out
}
