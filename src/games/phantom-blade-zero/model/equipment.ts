import { ModuleError } from '../../../sdk/error'
import type { ValidationIssue } from '../../../sdk/types'
import {
  getPbzEquipment,
  type PbzEquipmentCategory,
  type PbzEquipmentItem,
} from '../catalog/equipmentCatalog'
import { formatPbzTime } from './inventoryRecord'
import { isEditableSlotName } from './editableSlotName'
import type { PbzEditableSlot, PbzSaveModel } from './saveModel'

const CATEGORY_FIELD: Record<PbzEquipmentCategory, string> = {
  'main-weapon': 'MainWeaponInfos',
  'phantom-weapon': 'ShaChiWeaponInfo',
  accessory: 'AccessoryInfos',
}

const LEVEL_FIELD: Record<PbzEquipmentCategory, string> = {
  'main-weapon': 'WeaponLevel',
  'phantom-weapon': 'ShaChiWeaponLevel',
  accessory: 'CurrentLevel',
}

export interface PbzEquipmentView {
  id: string
  category: PbzEquipmentCategory
  /** 0-based strengthen count (WeaponLevel/ShaChiWeaponLevel = level + 1). */
  level: number
  /** Catalog ceiling (weapons: max game/WeaponLevel; accessories: max CurrentLevel). */
  maxLevel: number
  /** 0-based edit ceiling (may exceed catalog when the save is already higher). */
  editMaxLevel: number
}

/** Main / phantom grades are stored as WeaponLevel = strengthen + 1. */
export function isWeaponGradeCategory(
  category: PbzEquipmentCategory,
): boolean {
  return category === 'main-weapon' || category === 'phantom-weapon'
}

/** Catalog `maxLevel` for weapons is the max game grade (WeaponLevel). */
export function maxInternalLevel(item: PbzEquipmentItem): number {
  if (isWeaponGradeCategory(item.category)) {
    return Math.max(0, item.maxLevel - 1)
  }
  return item.maxLevel
}

export function toDisplayLevel(
  category: PbzEquipmentCategory,
  internalLevel: number,
): number {
  return isWeaponGradeCategory(category) ? internalLevel + 1 : internalLevel
}

export function fromDisplayLevel(
  category: PbzEquipmentCategory,
  displayLevel: number,
): number {
  return isWeaponGradeCategory(category) ? displayLevel - 1 : displayLevel
}

export function minDisplayLevel(category: PbzEquipmentCategory): number {
  return isWeaponGradeCategory(category) ? 1 : 0
}

export function toDisplayMax(
  category: PbzEquipmentCategory,
  internalMax: number,
): number {
  return isWeaponGradeCategory(category) ? internalMax + 1 : internalMax
}

export function projectEquipment(
  slot: PbzEditableSlot,
  category: PbzEquipmentCategory,
): PbzEquipmentView[] {
  const infos = getEquipmentInfos(slot.document, category)
  if (!infos) return []

  const rows: PbzEquipmentView[] = []
  for (const [id, value] of Object.entries(infos)) {
    const item = getPbzEquipment(id)
    if (!item || item.category !== category) continue
    if (!isPlainObject(value)) continue
    const level = readUiLevel(category, value)
    if (level === null) continue
    const editMaxLevel = Math.max(maxInternalLevel(item), level)
    rows.push({
      id,
      category,
      level,
      maxLevel: item.maxLevel,
      editMaxLevel,
    })
  }
  rows.sort((a, b) => a.id.localeCompare(b.id))
  return rows
}

export function addEquipment(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  uiLevel = 0,
  now = new Date(),
): void {
  const item = requireEquipment(id)
  const slot = requireSlot(model, slotName)
  requireUiLevel(item, uiLevel, false)
  const stamp = safeStamp(now, id)
  const infos = requireEquipmentInfos(slot, item.category)
  const existing = infos[id]
  if (isPlainObject(existing)) {
    const current = readUiLevel(item.category, existing) ?? 0
    const next = Math.max(current, uiLevel)
    applyLevel(item, existing, next, stamp)
    slot.dirty = true
    return
  }

  const cycle = readEquipmentCycle(slot)
  const record: Record<string, unknown> = {}
  applyLevel(item, record, uiLevel, stamp)
  if (item.category === 'main-weapon') {
    record.DateTime ??= stamp
    record.AlreadySnapSoul ??= 0
    record.AcquiredCycle ??= cycle
    record.FirstAcquiredCycle ??= cycle
  } else if (item.category === 'phantom-weapon') {
    record.DirtyTime ??= stamp
    record.AlreadySnapSoul ??= false
    record.AcquiredCycle ??= cycle
    record.FirstAcquiredCycle ??= cycle
  } else {
    record.DirtyTime ??= stamp
    record.AcquiredCycle ??= cycle
  }
  infos[id] = record
  slot.dirty = true
}

export function setEquipmentLevel(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  uiLevel: number,
): void {
  const item = requireEquipment(id)
  const slot = requireSlot(model, slotName)
  const infos = requireEquipmentInfos(slot, item.category)
  const record = infos[id]
  if (!isPlainObject(record)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  const current = readUiLevel(item.category, record)
  if (current === null) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  const ceiling = Math.max(maxInternalLevel(item), current)
  if (!isIntegerInRange(uiLevel, 0, ceiling)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  applyLevel(item, record, uiLevel, formatPbzTime(new Date()))
  slot.dirty = true
}

export function removeEquipment(
  model: PbzSaveModel,
  slotName: string,
  id: string,
): void {
  const item = requireEquipment(id)
  const slot = requireSlot(model, slotName)
  const inventory = requireInventory(slot)
  const infos = requireEquipmentInfos(slot, item.category)
  if (!Object.prototype.hasOwnProperty.call(infos, id)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }

  if (item.category === 'main-weapon') {
    const mainWeapons = inventory.MainWeapons
    const current = inventory.CurrentMainWeaponID
    const equippedList = Array.isArray(mainWeapons)
      ? mainWeapons.some((value) => value === id)
      : false
    if (equippedList || current === id) {
      throw new ModuleError('PBZ_INVALID_EDIT', [id])
    }
  }
  if (item.category === 'phantom-weapon') {
    const list = inventory.ShaqiWeapons
    if (Array.isArray(list) && list.some((value) => value === id)) {
      throw new ModuleError('PBZ_INVALID_EDIT', [id])
    }
  }
  if (item.category === 'accessory') {
    const slots = inventory.AccessoryIDs
    if (Array.isArray(slots)) {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === id) slots[i] = 'None'
      }
    }
  }

  delete infos[id]
  slot.dirty = true
}

export function collectEquipmentIssues(
  slot: PbzEditableSlot,
  issues: ValidationIssue[],
): void {
  const inventory = getRecord(slot.document, 'Inventory')
  if (!inventory) return

  for (const category of Object.keys(CATEGORY_FIELD) as PbzEquipmentCategory[]) {
    const field = CATEGORY_FIELD[category]
    const infos = inventory[field]
    if (infos === undefined) continue
    if (!isPlainObject(infos)) {
      issues.push({ code: 'PBZ_INVALID_EQUIPMENT', args: [slot.name, field] })
      continue
    }
    for (const [id, value] of Object.entries(infos)) {
      const item = getPbzEquipment(id)
      if (!item || item.category !== category) continue
      if (!isPlainObject(value)) {
        issues.push({ code: 'PBZ_INVALID_EQUIPMENT', args: [slot.name, id] })
        continue
      }
      const level = readUiLevel(category, value)
      if (level === null || level < 0 || level > 999) {
        issues.push({ code: 'PBZ_INVALID_EQUIPMENT', args: [slot.name, id] })
      }
    }
  }
}

function applyLevel(
  item: PbzEquipmentItem,
  record: Record<string, unknown>,
  uiLevel: number,
  stamp: string,
): void {
  const field = LEVEL_FIELD[item.category]
  if (item.category === 'accessory') {
    record[field] = uiLevel
    record.HasUIRedPoint = true
    record.DirtyTime = stamp
    return
  }
  record[field] = uiLevel + 1
  record.HasUIRedPoint = true
  if (item.category === 'phantom-weapon') {
    record.DirtyTime = stamp
  }
}

function readUiLevel(
  category: PbzEquipmentCategory,
  record: Record<string, unknown>,
): number | null {
  const raw = record[LEVEL_FIELD[category]]
  // Live saves often omit the level until first strengthen; default UI 0
  // (weapons: stored grade 1). Match PBZ-Editor inventory_level semantics.
  if (raw === undefined) return 0
  if (!isIntegerInRange(raw, 0, 999)) return null
  if (category === 'accessory') return raw
  return Math.max(1, raw) - 1
}

function requireUiLevel(
  item: PbzEquipmentItem,
  uiLevel: number,
  allowExistingCeiling: boolean,
): void {
  const max = allowExistingCeiling ? 999 : maxInternalLevel(item)
  if (!isIntegerInRange(uiLevel, 0, max)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [item.id])
  }
}

function requireEquipment(id: string): PbzEquipmentItem {
  const item = getPbzEquipment(id)
  if (!item) throw new ModuleError('PBZ_INVALID_EDIT', [id])
  return item
}

function requireSlot(model: PbzSaveModel, name: string): PbzEditableSlot {
  if (!isEditableSlotName(name)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [name])
  }
  const slot = model.slots.find((candidate) => candidate.name === name)
  if (!slot) throw new ModuleError('PBZ_INVALID_EDIT', [name])
  return slot
}

function requireInventory(slot: PbzEditableSlot): Record<string, unknown> {
  let inventory = getRecord(slot.document, 'Inventory')
  if (!inventory) {
    inventory = {}
    slot.document.Inventory = inventory
  }
  return inventory
}

function requireEquipmentInfos(
  slot: PbzEditableSlot,
  category: PbzEquipmentCategory,
): Record<string, unknown> {
  const inventory = requireInventory(slot)
  const field = CATEGORY_FIELD[category]
  let infos = inventory[field]
  if (infos === undefined) {
    infos = {}
    inventory[field] = infos
  }
  if (!isPlainObject(infos)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [field])
  }
  return infos
}

function getEquipmentInfos(
  document: Record<string, unknown>,
  category: PbzEquipmentCategory,
): Record<string, unknown> | null {
  const inventory = getRecord(document, 'Inventory')
  if (!inventory) return null
  return getRecord(inventory, CATEGORY_FIELD[category])
}

function readEquipmentCycle(slot: PbzEditableSlot): number {
  const inventory = getRecord(slot.document, 'Inventory')
  if (inventory) {
    const infos = getRecord(inventory, 'InventoryInfos')
    if (infos) {
      const cycles = Object.values(infos).flatMap((value) => {
        if (!isPlainObject(value)) return []
        return isIntegerInRange(value.AcquiredCycle, 0, Number.MAX_SAFE_INTEGER)
          ? [value.AcquiredCycle]
          : []
      })
      if (cycles.length > 0) return Math.max(...cycles)
    }
  }
  const system = getRecord(slot.document, 'PBZGameSystem')
  if (system && isIntegerInRange(system.CycleCount, 0, Number.MAX_SAFE_INTEGER)) {
    return system.CycleCount
  }
  return 0
}

function safeStamp(now: Date, id: string): string {
  try {
    if (!(now instanceof Date)) throw new RangeError('invalid Date')
    return formatPbzTime(now)
  } catch {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
}

function getRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = record[key]
  return isPlainObject(value) ? value : null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}
