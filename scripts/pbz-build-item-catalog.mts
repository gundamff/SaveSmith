import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type Category = 'weapon-material' | 'consumable'
type ExportedRow = {
  id: string
  name: string
  itemType: string
  detailType: string
  materialType: string
}
type ItemRow = {
  id: string
  category: Category
  zh: string
  en: string
  maxAmount: number
}

const exportRoot = process.env.PBZ_EXPORT_DIR
if (!exportRoot) throw new Error('PBZ_EXPORT_DIR is required')

const zhRows = readRows(join(exportRoot, 'tables.zh-Hans.json'))
const enRows = readRows(join(exportRoot, 'tables.en.json'))
const zhById = uniqueRows(zhRows, 'zh-Hans')
const enById = uniqueRows(enRows, 'en')
const thresholdCollectibleIds = new Set([
  'Item_001',
  'Item_002',
  'Item_Piece_001',
  'Item_Piece_002'
])

const rows: ItemRow[] = []
for (const source of zhById.values()) {
  const category = classify(source)
  if (!category || thresholdCollectibleIds.has(source.id)) continue
  const english = enById.get(source.id)
  if (!english) throw new Error(`Missing en export row for ${source.id}`)
  assertSameClassification(source, english)
  rows.push({
    id: source.id,
    category,
    zh: source.name,
    en: english.name,
    maxAmount: 9999
  })
}

const output = rows
  .filter(accept)
  .filter((row) => !thresholdCollectibleIds.has(row.id))
  .sort((a, b) => a.id.localeCompare(b.id))

if (output.length !== 28) {
  throw new Error(`Expected 28 supported PBZ rows, received ${output.length}`)
}
if (output.filter(({ category }) => category === 'weapon-material').length !== 27) {
  throw new Error('Expected 27 weapon material rows')
}
if (output.filter(({ category }) => category === 'consumable').map(({ id }) => id).join() !==
  'Item_Traversing') {
  throw new Error('PBZ consumable whitelist must contain only Item_Traversing')
}
if (new Set(output.map(({ id }) => id)).size !== output.length) {
  throw new Error('Duplicate catalog IDs are not allowed')
}
if (output.some(({ zh, en }) => !zh && !en)) {
  throw new Error('Every catalog row requires a localized name')
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = join(scriptDir, '..', 'src', 'games', 'phantom-blade-zero', 'catalog', 'items.json')
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)

const materials = output.filter(({ category }) => category === 'weapon-material').length
const consumables = output.filter(({ category }) => category === 'consumable').length
console.log(`Wrote ${output.length} PBZ items (${materials} materials, ${consumables} consumables)`)

function readRows(path: string): ExportedRow[] {
  const document: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!isRecord(document) || !Array.isArray(document.normalizedInventory)) {
    throw new Error(`Missing normalizedInventory in ${path}`)
  }
  return document.normalizedInventory.map((value, index) => {
    if (!isRecord(value)) throw new Error(`Invalid normalized row ${index} in ${path}`)
    const row = {
      id: value.id,
      name: value.name,
      itemType: value.itemType,
      detailType: value.detailType,
      materialType: value.materialType
    }
    if (Object.values(row).some((field) => typeof field !== 'string')) {
      throw new Error(`Invalid normalized row ${index} in ${path}`)
    }
    return row as ExportedRow
  })
}

function uniqueRows(rows: ExportedRow[], culture: string): Map<string, ExportedRow> {
  const result = new Map<string, ExportedRow>()
  for (const row of rows) {
    const previous = result.get(row.id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) {
      throw new Error(`Conflicting ${culture} rows for ${row.id}`)
    }
    if (previous) throw new Error(`Duplicate ${culture} row for ${row.id}`)
    result.set(row.id, row)
  }
  return result
}

function classify(row: ExportedRow): Category | null {
  if (row.id.startsWith('Weapon_Material_')) {
    if (
      row.detailType !== 'EItemDetailType::Material' ||
      ![
        'EItemMaterialType::WeaponUpgradeMaterial',
        'EItemMaterialType::ShaChiWeaponUpgradeMaterial'
      ].includes(row.materialType)
    ) {
      throw new Error(`Unsupported weapon material classification for ${row.id}`)
    }
    return 'weapon-material'
  }
  if (row.id === 'Item_Traversing') {
    if (
      row.itemType !== 'EItemTypes::Item' ||
      row.detailType !== 'EItemDetailType::Material' ||
      row.materialType !== 'EItemMaterialType::None'
    ) {
      throw new Error('Unsupported Item_Traversing classification')
    }
    return 'consumable'
  }
  return null
}

function assertSameClassification(left: ExportedRow, right: ExportedRow): void {
  for (const field of ['itemType', 'detailType', 'materialType'] as const) {
    if (left[field] !== right[field]) {
      throw new Error(`Conflicting ${field} for ${left.id}`)
    }
  }
}

function accept(row: ItemRow): boolean {
  if (row.category === 'weapon-material') return row.id.startsWith('Weapon_Material_')
  return row.category === 'consumable' && row.id === 'Item_Traversing' && row.maxAmount > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
