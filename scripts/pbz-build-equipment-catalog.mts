/**
 * Convert a local gear catalog dump into `catalog/equipment.json`.
 *
 * Expects `$env:PBZ_EQUIPMENT_CATALOG` to point at a JSON file shaped like
 * `{ items: [{ id, category, name, name_en, max_level, supported, experimental }] }`
 * where category is `weapon` | `phantom` | `accessory` (PBZ table naming).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type SourceCategory = 'weapon' | 'phantom' | 'accessory'
type OutCategory = 'main-weapon' | 'phantom-weapon' | 'accessory'

const MAP: Record<SourceCategory, OutCategory> = {
  weapon: 'main-weapon',
  phantom: 'phantom-weapon',
  accessory: 'accessory',
}

const DEFAULT_WEAPON_MAX_LEVEL = 20
const sourcePath = process.env.PBZ_EQUIPMENT_CATALOG
if (!sourcePath) {
  throw new Error('PBZ_EQUIPMENT_CATALOG is required')
}

const raw = JSON.parse(readFileSync(sourcePath, 'utf8')) as
  | Array<Record<string, unknown>>
  | { items: Array<Record<string, unknown>> }
const items = Array.isArray(raw) ? raw : raw.items
if (!Array.isArray(items)) throw new Error('catalog items array missing')

const rows: Array<{
  id: string
  category: OutCategory
  zh: string
  en: string
  maxLevel: number
}> = []

for (const item of items) {
  const mapped = MAP[item.category as SourceCategory]
  if (!mapped) continue
  if (item.supported === false) continue
  if (item.experimental) continue
  const maxLevel =
    typeof item.max_level === 'number' && Number.isInteger(item.max_level)
      ? item.max_level
      : DEFAULT_WEAPON_MAX_LEVEL
  rows.push({
    id: String(item.id),
    category: mapped,
    zh: String(item.name ?? ''),
    en: String(item.name_en ?? ''),
    maxLevel,
  })
}

rows.sort((a, b) =>
  a.category === b.category
    ? a.id.localeCompare(b.id)
    : a.category.localeCompare(b.category),
)

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/games/phantom-blade-zero/catalog/equipment.json',
)
writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
console.log(`wrote ${rows.length} equipment rows → ${out}`)
