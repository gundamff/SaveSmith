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
  thresholdRisk: boolean
}

const MATERIAL_MAX_AMOUNT = 9999
const TRAVERSING_SAFE_MAX_AMOUNT = 99
const GROWTH_MAX_AMOUNT = 9999

/** Threshold / integration collectibles: editable, but UI must warn. */
const THRESHOLD_RISK_IDS = new Set([
  'Item_001',
  'Item_002',
  'Item_Piece_001',
  'Item_Piece_002'
])

/** In-game 养成 growth items (excluding weapon mats, snap-soul, memory flower, book, quest). */
const GROWTH_CONSUMABLE_IDS = new Set([
  'Item_001',
  'Item_002',
  'Item_Piece_001',
  'Item_Piece_002',
  'ShaqiHexin',
  'I_060002',
  'Ac_Material_1',
  'Ac_Material_4',
  'Medi_Material_1',
  'Medi_Material_2',
  'Medi_Material_3',
  'Item_Traversing'
])

const ACCESSORY_MATERIAL = 'EItemMaterialType::AccessoryUpgradeMaterial'
const MEDICINE_MATERIAL = 'EItemMaterialType::MedicineUpgradeMaterial'
const CORE_PROGRESSION = 'EItemMaterialType::CoreProgressionMaterial'
const WEAPON_MATERIALS = new Set([
  'EItemMaterialType::WeaponUpgradeMaterial',
  'EItemMaterialType::ShaChiWeaponUpgradeMaterial'
])

const exportRoot = process.env.PBZ_EXPORT_DIR
if (!exportRoot) throw new Error('PBZ_EXPORT_DIR is required')

const zhRows = readRows(join(exportRoot, 'tables.zh-Hans.json'))
const enRows = readRows(join(exportRoot, 'tables.en.json'))
const zhById = uniqueRows(zhRows, 'zh-Hans')
const enById = uniqueRows(enRows, 'en')

const rows: ItemRow[] = []
for (const source of zhById.values()) {
  const category = classify(source)
  if (!category) continue
  const english = enById.get(source.id)
  if (!english) throw new Error(`Missing en export row for ${source.id}`)
  assertSameClassification(source, english)
  rows.push({
    id: source.id,
    category,
    zh: source.name,
    en: english.name,
    maxAmount: maxAmountFor(source.id, category),
    thresholdRisk: THRESHOLD_RISK_IDS.has(source.id)
  })
}

const output = rows
  .filter(accept)
  .sort((a, b) => a.id.localeCompare(b.id))

const weaponCount = output.filter(({ category }) => category === 'weapon-material').length
const consumableIds = output
  .filter(({ category }) => category === 'consumable')
  .map(({ id }) => id)
  .sort()

if (weaponCount !== 27) {
  throw new Error(`Expected 27 weapon material rows, received ${weaponCount}`)
}
if (consumableIds.join() !== [...GROWTH_CONSUMABLE_IDS].sort().join()) {
  throw new Error(
    `PBZ growth consumable whitelist mismatch: ${consumableIds.join(',')}`
  )
}
if (output.length !== 27 + GROWTH_CONSUMABLE_IDS.size) {
  throw new Error(`Expected ${27 + GROWTH_CONSUMABLE_IDS.size} rows, received ${output.length}`)
}
if (new Set(output.map(({ id }) => id)).size !== output.length) {
  throw new Error('Duplicate catalog IDs are not allowed')
}
if (output.some(({ zh, en }) => !zh && !en)) {
  throw new Error('Every catalog row requires a localized name')
}
if (output.filter(({ thresholdRisk }) => thresholdRisk).map(({ id }) => id).sort().join() !==
  [...THRESHOLD_RISK_IDS].sort().join()) {
  throw new Error('Threshold-risk flag set must match THRESHOLD_RISK_IDS')
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = join(scriptDir, '..', 'src', 'games', 'phantom-blade-zero', 'catalog', 'items.json')
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)

const materials = output.filter(({ category }) => category === 'weapon-material').length
const consumables = output.filter(({ category }) => category === 'consumable').length
console.log(`Wrote ${output.length} PBZ items (${materials} materials, ${consumables} growth consumables)`)

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
      !WEAPON_MATERIALS.has(row.materialType)
    ) {
      throw new Error(`Unsupported weapon material classification for ${row.id}`)
    }
    return 'weapon-material'
  }

  if (!GROWTH_CONSUMABLE_IDS.has(row.id)) return null
  assertGrowthClassification(row)
  return 'consumable'
}

function assertGrowthClassification(row: ExportedRow): void {
  if (row.id === 'Item_Traversing') {
    if (
      row.itemType !== 'EItemTypes::Item' ||
      row.detailType !== 'EItemDetailType::Material' ||
      row.materialType !== 'EItemMaterialType::None'
    ) {
      throw new Error('Unsupported Item_Traversing classification')
    }
    return
  }

  if (row.id.startsWith('Ac_Material_')) {
    if (
      row.detailType !== 'EItemDetailType::Material' ||
      row.materialType !== ACCESSORY_MATERIAL
    ) {
      throw new Error(`Unsupported accessory material classification for ${row.id}`)
    }
    return
  }

  if (row.id.startsWith('Medi_Material_')) {
    if (
      row.detailType !== 'EItemDetailType::Material' ||
      row.materialType !== MEDICINE_MATERIAL
    ) {
      throw new Error(`Unsupported medicine material classification for ${row.id}`)
    }
    return
  }

  if (row.id === 'I_060002') {
    if (
      row.detailType !== 'EItemDetailType::Material' ||
      row.materialType !== CORE_PROGRESSION
    ) {
      throw new Error('Unsupported I_060002 classification')
    }
    return
  }

  // Black stone / amber / fragments / sha-qi core: AddAttribute progression currency.
  if (row.detailType !== 'EItemDetailType::AddAttribute') {
    throw new Error(`Expected AddAttribute for growth item ${row.id}`)
  }
}

function maxAmountFor(id: string, category: Category): number {
  if (category === 'weapon-material') return MATERIAL_MAX_AMOUNT
  if (id === 'Item_Traversing') return TRAVERSING_SAFE_MAX_AMOUNT
  return GROWTH_MAX_AMOUNT
}

function assertSameClassification(left: ExportedRow, right: ExportedRow): void {
  for (const field of ['itemType', 'detailType', 'materialType'] as const) {
    if (left[field] !== right[field]) {
      throw new Error(`Conflicting ${field} for ${left.id}`)
    }
  }
}

function accept(row: ItemRow): boolean {
  if (row.category === 'weapon-material') {
    return row.id.startsWith('Weapon_Material_') && row.maxAmount > 0
  }
  return (
    row.category === 'consumable' &&
    GROWTH_CONSUMABLE_IDS.has(row.id) &&
    row.maxAmount > 0 &&
    row.thresholdRisk === THRESHOLD_RISK_IDS.has(row.id)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
