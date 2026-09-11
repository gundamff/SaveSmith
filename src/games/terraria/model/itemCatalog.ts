import itemsCatalog from '../data/items.json'

type ItemRow = { id: number; name: { zh: string; en: string } }

const catalog = itemsCatalog as ItemRow[]

const byId = new Map<number, ItemRow>()
for (const row of catalog) byId.set(row.id, row)

export function getItemRow(id: number): ItemRow | undefined {
  return byId.get(id)
}

export function listCatalogItems(): ItemRow[] {
  return catalog
}

export function searchItems(query: string, limit = 80): ItemRow[] {
  const q = query.trim().toLowerCase()
  const list = catalog.filter((x) => x.id !== 0)
  if (!q) return list.slice(0, limit)
  const out: ItemRow[] = []
  for (const x of list) {
    if (
      x.name.zh.toLowerCase().includes(q) ||
      x.name.en.toLowerCase().includes(q) ||
      String(x.id).includes(q)
    ) {
      out.push(x)
      if (out.length >= limit) break
    }
  }
  return out
}
