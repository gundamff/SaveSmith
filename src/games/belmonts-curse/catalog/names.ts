import items from './items.json'

type ItemEntry = { zh: string; en: string }
type ItemsJson = Record<string, ItemEntry>

const catalog = items as ItemsJson

export function lookupItemName(id: string, locale: 'zh' | 'en'): string {
  const row = catalog[id]
  if (!row) return id
  if (locale === 'en') return row.en || id
  const zh = row.zh.trim()
  if (zh) return zh
  return row.en || id
}
