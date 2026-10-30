import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from '../src/games/phantom-blade-zero/parse'

const root = process.env.PBZ_EXPORT_DIR
if (!root) throw new Error('PBZ_EXPORT_DIR is required')

const hits: Array<{ file: string; ids: string[] }> = []
const idPattern = /\b(?:Weapon_Material|Item|Consumable)_[A-Za-z0-9_]+\b/g

function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path)
    } else if (/\.(json|txt|csv)$/i.test(name) && !name.startsWith('pbz-item-')) {
      const ids = [...new Set(readFileSync(path, 'utf8').match(idPattern) ?? [])].sort()
      if (ids.length > 0) hits.push({ file: relative(root!, path), ids })
    }
  }
}

walk(root)
hits.sort((a, b) => a.file.localeCompare(b.file))
writeFileSync(join(root, 'pbz-item-assets-report.json'), `${JSON.stringify(hits, null, 2)}\n`)
if (hits.length === 0) throw new Error('No PBZ inventory IDs found in exports')

const savePath = process.env.PBZ_SAVE
if (savePath) {
  const state = await parse([{
    relativePath: 'PBZSaveGame.sav',
    bytes: readFileSync(savePath)
  }])
  const shapeCounts = new Map<string, AuditedShape>()

  for (const slot of state.model.slots) {
    const inventory = asRecord(slot.document.Inventory)
    const infos = asRecord(inventory?.InventoryInfos)
    if (!infos) continue
    for (const [id, value] of Object.entries(infos)) {
      const record = asRecord(value)
      if (!record) continue
      const category = id.startsWith('Weapon_Material_')
        ? 'weapon-material'
        : id === 'Item_Traversing' ? 'consumable' : 'other'
      const fields = Object.keys(record).sort()
      const valueTypes = Object.fromEntries(fields.map((field) => [field, valueType(record[field])]))
      const key = JSON.stringify({ category, fields, valueTypes })
      const shape = shapeCounts.get(key)
      if (shape) shape.count += 1
      else shapeCounts.set(key, { category, fields, valueTypes, count: 1 })
    }
  }

  const auditedShapes = [...shapeCounts.values()].sort((a, b) =>
    a.category.localeCompare(b.category) || a.fields.join().localeCompare(b.fields.join()))
  const requiredFields = [
    'AcquiredCycle',
    'CurrentAmount',
    'DirtyTime',
    'FirstAddTime',
    'MaxAmount'
  ]
  if (!auditedShapes.every((shape) =>
    requiredFields.every((field) => shape.fields.includes(field))
  )) {
    throw new Error('PBZ inventory record schema is not safe for creation')
  }
  if (!auditedShapes.some(({ category }) => category === 'consumable')) {
    throw new Error('PBZ consumable record schema was not observed')
  }
  writeFileSync(
    join(root, 'pbz-item-shapes-report.json'),
    `${JSON.stringify(auditedShapes, null, 2)}\n`
  )
}

console.log(`Discovered ${hits.length} exported files with PBZ inventory IDs`)

interface AuditedShape {
  category: string
  fields: string[]
  valueTypes: Record<string, string>
  count: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function valueType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}
