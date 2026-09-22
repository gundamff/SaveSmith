import {
  ITEM_DEFINITION_ID_KEY,
  ITEM_EQUIPPED_FIGHTER_KEY,
  ITEM_EQUIPPED_SLOT_KEY,
  ITEM_EXCEPTIONAL_ROLL_KEY,
  ITEM_INSTANCE_ID_KEY,
  ITEM_INVENTORY_SLOT_KEY,
  ITEM_QUALITY_KEY,
  ITEM_ROLLED_MODIFIERS_KEY,
  ITEM_ROSTER_PATH,
  ITEM_STATS_KEY
} from './fields'
import { clampItemStatAmount } from './bounds'
import type { ItemRow, ItemStatLine } from './types'
import type { IntResourceWire, PropWire, ResValue, ResourceDoc } from '../resource/binary'
import {
  OBJECT_INTERNAL_RESOURCE,
  VARIANT_OBJECT,
  isRawValue,
  resValueToVariant,
  variantToResValue
} from '../resource/variant'

export type { ItemRow, ItemStatLine } from './types'

/** Opaque apply handle — resourceIndex into doc.wire.resources. */
export type ItemRef = { resourceIndex: number }

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function decodeInternalIndex(raw: { __raw: Uint8Array }): number | null {
  if (raw.__raw.length < 12) return null
  const view = new DataView(raw.__raw.buffer, raw.__raw.byteOffset, raw.__raw.byteLength)
  const type = view.getUint32(0, true)
  const objType = view.getUint32(4, true)
  const index = view.getUint32(8, true)
  if (type !== VARIANT_OBJECT || objType !== OBJECT_INTERNAL_RESOURCE) return null
  return index
}

function getProp(res: IntResourceWire, name: string): PropWire | undefined {
  return res.properties.find((p) => p.name === name)
}

function readPropValue(res: IntResourceWire, name: string): ResValue | undefined {
  const p = getProp(res, name)
  return p ? variantToResValue(p.value) : undefined
}

function writePropValue(res: IntResourceWire, name: string, value: ResValue): void {
  const existing = getProp(res, name)
  if (existing) {
    existing.value = resValueToVariant(value, existing.value)
    return
  }
  res.properties.push({
    name,
    nameIndex: null,
    inline: true,
    value: resValueToVariant(value)
  })
}

/** Write only when the property already exists — never invent keys on live dumps. */
function writePropIfPresent(res: IntResourceWire, name: string, value: ResValue): void {
  if (!getProp(res, name)) return
  writePropValue(res, name, value)
}

function statsFromRolledModifiers(rolled: ResValue | undefined): ItemStatLine[] {
  if (!rolled || typeof rolled !== 'object' || Array.isArray(rolled) || isRawValue(rolled)) {
    return []
  }
  const out: ItemStatLine[] = []
  for (const [statId, raw] of Object.entries(rolled as Record<string, unknown>)) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    out.push({ statId, amount: raw, ratio: 0 })
  }
  return out
}

function statsFromStatsProp(raw: ResValue | undefined): ItemStatLine[] | null {
  if (!Array.isArray(raw)) return null
  const out: ItemStatLine[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || isRawValue(entry)) continue
    const e = entry as Record<string, unknown>
    const statId = asString(e.stat_id ?? e.statId)
    if (!statId) continue
    const line: ItemStatLine = {
      statId,
      amount: asNumber(e.amount),
      ratio: asNumber(e.ratio)
    }
    const display = e.display_value ?? e.displayValue
    if (typeof display === 'string') line.displayValue = display
    out.push(line)
  }
  return out
}

function rolledModifiersFromStats(stats: ItemStatLine[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const line of stats) {
    if (!line.statId) continue
    const value =
      typeof line.amount === 'number' && Number.isFinite(line.amount)
        ? clampItemStatAmount(line.statId, line.amount)
        : typeof line.ratio === 'number' && Number.isFinite(line.ratio)
          ? line.ratio
          : null
    if (value === null) continue
    out[line.statId] = value
  }
  return out
}

function statsToPropValue(stats: ItemStatLine[]): ResValue {
  return stats.map((line) => {
    const row: Record<string, ResValue> = {
      stat_id: line.statId,
      amount: line.amount,
      ratio: line.ratio
    }
    if (line.displayValue !== undefined) row.display_value = line.displayValue
    return row
  })
}

function projectItem(doc: ResourceDoc, resourceIndex: number): ItemRow | null {
  const res = doc.wire.resources[resourceIndex]
  if (!res) return null

  const rolledModifiers = readPropValue(res, ITEM_ROLLED_MODIFIERS_KEY) ?? {}
  const fromStats = statsFromStatsProp(readPropValue(res, ITEM_STATS_KEY))
  const stats = fromStats ?? statsFromRolledModifiers(rolledModifiers)

  return {
    instanceId: asString(readPropValue(res, ITEM_INSTANCE_ID_KEY)),
    definitionId: asString(readPropValue(res, ITEM_DEFINITION_ID_KEY)),
    quality: asString(readPropValue(res, ITEM_QUALITY_KEY)),
    exceptionalRoll: asBool(readPropValue(res, ITEM_EXCEPTIONAL_ROLL_KEY)),
    equippedFighterId: asString(readPropValue(res, ITEM_EQUIPPED_FIGHTER_KEY)),
    equippedSlot: asNumber(readPropValue(res, ITEM_EQUIPPED_SLOT_KEY), -1),
    inventorySlot: asNumber(readPropValue(res, ITEM_INVENTORY_SLOT_KEY), -1),
    rolledModifiers,
    stats,
    _ref: { resourceIndex } satisfies ItemRef
  }
}

function refIndex(row: ItemRow): number | null {
  const ref = row._ref as ItemRef | null | undefined
  if (ref && typeof ref.resourceIndex === 'number') return ref.resourceIndex
  return null
}

/** List player-owned item instances only (owned_item_instances). */
export function listOwnedItems(doc: ResourceDoc): ItemRow[] {
  const roster = doc.root[ITEM_ROSTER_PATH]
  if (!Array.isArray(roster)) return []

  const rows: ItemRow[] = []
  for (const item of roster) {
    let index: number | null = null
    if (isRawValue(item)) index = decodeInternalIndex(item)
    if (index === null) continue
    const row = projectItem(doc, index)
    if (row) rows.push(row)
  }
  return rows
}

/**
 * Write editable ItemRow fields back onto the original wire Resource.
 * Unknown / unlisted properties are left intact. `quality` / `stats` props are
 * written only when already present (live dump has neither).
 */
export function applyItem(doc: ResourceDoc, row: ItemRow): void {
  const index = refIndex(row)
  if (index === null) throw new Error('items: missing _ref.resourceIndex')
  const res = doc.wire.resources[index]
  if (!res) throw new Error(`items: resource ${index} missing`)

  writePropValue(res, ITEM_DEFINITION_ID_KEY, row.definitionId)
  writePropIfPresent(res, ITEM_QUALITY_KEY, row.quality)

  if (row.exceptionalRoll !== undefined) {
    writePropValue(res, ITEM_EXCEPTIONAL_ROLL_KEY, row.exceptionalRoll)
  }

  writePropIfPresent(res, ITEM_EQUIPPED_FIGHTER_KEY, row.equippedFighterId)
  writePropIfPresent(res, ITEM_EQUIPPED_SLOT_KEY, row.equippedSlot)
  writePropIfPresent(res, ITEM_INVENTORY_SLOT_KEY, row.inventorySlot)

  const rolled = rolledModifiersFromStats(
    row.stats.map((line) => ({
      ...line,
      amount: clampItemStatAmount(line.statId, line.amount)
    }))
  )
  writePropValue(res, ITEM_ROLLED_MODIFIERS_KEY, rolled)
  writePropIfPresent(res, ITEM_STATS_KEY, statsToPropValue(row.stats))
}
