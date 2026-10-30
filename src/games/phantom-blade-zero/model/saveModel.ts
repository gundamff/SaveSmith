import { ModuleError } from '../../../sdk/error'
import type { ValidationIssue } from '../../../sdk/types'
import {
  getPbzItem,
  type PbzCatalogItem,
  type PbzItemCategory
} from '../catalog'
import { createInventoryRecord, formatPbzTime } from './inventoryRecord'

const EDITABLE_SLOT_NAME = /^(?:AutoSave|ManualSave)\d+$/
const MAX_DUST = 99_999_999
const MAX_MATERIAL_AMOUNT = 9999

export interface PbzInventoryItemView {
  id: string
  category: PbzItemCategory
  currentAmount: number
  maxAmount: number
}

export interface PbzMaterialView {
  id: string
  currentAmount: number
  maxAmount: number
}

export interface PbzEditableSlot {
  name: string
  document: Record<string, unknown>
  dirty: boolean
}

export interface PbzSaveModel {
  slots: PbzEditableSlot[]
  selectedSlotName: string | null
}

interface InventoryRecord {
  record: Record<string, unknown>
  currentAmount: number
  maxAmount: number
}

export function isEditableSlotName(name: string): boolean {
  return EDITABLE_SLOT_NAME.test(name)
}

export function parseEditableSlot(name: string, payload: Uint8Array): PbzEditableSlot {
  if (!isEditableSlotName(name)) {
    throw new ModuleError('PBZ_SLOT_READ_ONLY', [name])
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(payload)
    const parsed: unknown = JSON.parse(text)
    if (!isPlainObject(parsed) || !hasValidDocumentStructure(parsed)) {
      throw new Error('invalid PBZ document')
    }
    return { name, document: parsed, dirty: false }
  } catch {
    throw new ModuleError('PBZ_INVALID_JSON', [name])
  }
}

export function createSaveModel(slots: readonly PbzEditableSlot[]): PbzSaveModel {
  return { slots: [...slots], selectedSlotName: null }
}

export function selectSlot(model: PbzSaveModel, name: string): void {
  if (!isEditableSlotName(name) || !model.slots.some((slot) => slot.name === name)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [name])
  }
  model.selectedSlotName = name
}

export function getSelectedSlot(model: PbzSaveModel): PbzEditableSlot | null {
  if (model.selectedSlotName === null) return null
  return model.slots.find((slot) => slot.name === model.selectedSlotName) ?? null
}

export function projectResources(slot: PbzEditableSlot): {
  dust: number
  materials: PbzMaterialView[]
} {
  const player = getRecord(slot.document, 'Player')
  const dust = player?.Dust
  const materials = projectInventory(slot, 'weapon-material').map(
    ({ id, currentAmount, maxAmount }) => ({ id, currentAmount, maxAmount })
  )

  return {
    dust: typeof dust === 'number' ? dust : Number.NaN,
    materials
  }
}

export function projectInventory(
  slot: PbzEditableSlot,
  category: PbzItemCategory
): PbzInventoryItemView[] {
  if (category !== 'weapon-material' && category !== 'consumable') {
    throw new ModuleError('PBZ_INVALID_EDIT', [category])
  }

  const infos = getInventoryInfos(slot.document)
  if (!infos) return []

  const projected: PbzInventoryItemView[] = []
  for (const id of Object.keys(infos).sort()) {
    const item = getPbzItem(id)
    if (!item || item.category !== category) continue
    const existing = readProjectedInventoryItem(infos, item)
    if (!existing) continue
    projected.push({
      id,
      category,
      currentAmount: existing.currentAmount,
      maxAmount: category === 'consumable' ? item.maxAmount : existing.maxAmount
    })
  }
  return projected
}

export function setDust(model: PbzSaveModel, slotName: string, value: number): void {
  if (!isIntegerInRange(value, 0, MAX_DUST)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }

  const slot = requireSlot(model, slotName)
  const player = getRecord(slot.document, 'Player')
  if (!player || !isIntegerInRange(player.Dust, 0, MAX_DUST)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }
  if (player.Dust === value) return

  player.Dust = value
  slot.dirty = true
}

export function setMaterialAmount(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  value: number
): void {
  const item = getPbzItem(id)
  if (!item || item.category !== 'weapon-material') {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  setInventoryAmount(model, slotName, id, value)
}

export function setAllExistingMaterials(
  model: PbzSaveModel,
  slotName: string,
  value = MAX_MATERIAL_AMOUNT
): void {
  if (!isIntegerInRange(value, 0, MAX_MATERIAL_AMOUNT)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }

  const slot = requireSlot(model, slotName)
  const materials = projectInventory(slot, 'weapon-material').map(({ id }) =>
    requireEditableInventoryItem(slot, requireCatalogItem(id))
  )
  for (const material of materials) {
    applyInventoryAmount(slot, material, value)
  }
}

export function setInventoryAmount(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  value: number
): void {
  const item = requireCatalogItem(id)
  requireAmount(item, value, true)
  const slot = requireSlot(model, slotName)
  const existing = requireEditableInventoryItem(slot, item)
  applyInventoryAmount(slot, existing, value)
}

export function addInventoryItem(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  amount: number,
  now = new Date()
): void {
  const item = requireCatalogItem(id)
  requireAmount(item, amount, false)
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  const slot = requireSlot(model, slotName)
  const infos = requireInventoryInfos(slot)

  if (Object.prototype.hasOwnProperty.call(infos, id)) {
    const existing = readProjectedInventoryItem(infos, item)
    if (!existing) throw new ModuleError('PBZ_INVALID_EDIT', [id])
    const nextAmount = existing.currentAmount + amount
    if (!isIntegerInRange(nextAmount, 0, item.maxAmount)) {
      throw new ModuleError('PBZ_INVALID_EDIT', [id])
    }
    applyInventoryAmount(slot, existing, nextAmount)
    existing.record.DirtyTime = formatPbzTime(now)
    return
  }

  infos[id] = createInventoryRecord(item, amount, now, readAcquiredCycle(slot))
  slot.dirty = true
}

export function serializeDirtySlots(model: PbzSaveModel): ReadonlyMap<string, Uint8Array> {
  const issues = validateSaveModel(model)
  if (issues.length > 0) {
    throw new ModuleError('PBZ_INVALID_EDIT', [issues[0]!.code])
  }

  const serialized = new Map<string, Uint8Array>()
  try {
    for (const slot of model.slots) {
      if (slot.dirty) {
        serialized.set(slot.name, new TextEncoder().encode(JSON.stringify(slot.document)))
      }
    }
  } catch {
    throw new ModuleError('PBZ_INVALID_EDIT', ['PBZ_INVALID_JSON'])
  }
  return serialized
}

export function validateSaveModel(model: PbzSaveModel): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const names = new Set<string>()

  for (const slot of model.slots) {
    if (!isEditableSlotName(slot.name)) {
      issues.push({ code: 'PBZ_INVALID_SLOT', args: [slot.name] })
    }
    if (names.has(slot.name)) {
      issues.push({ code: 'PBZ_DUPLICATE_SLOT', args: [slot.name] })
    }
    names.add(slot.name)
    validateDocument(slot, issues)
  }

  if (
    model.selectedSlotName !== null &&
    (!isEditableSlotName(model.selectedSlotName) || !names.has(model.selectedSlotName))
  ) {
    issues.push({ code: 'PBZ_INVALID_SELECTION', args: [model.selectedSlotName] })
  }

  return issues
}

function validateDocument(slot: PbzEditableSlot, issues: ValidationIssue[]): void {
  if (!isPlainObject(slot.document)) {
    issues.push({ code: 'PBZ_INVALID_DOCUMENT', args: [slot.name] })
    return
  }

  const player = getRecord(slot.document, 'Player')
  if (!player) {
    issues.push({ code: 'PBZ_INVALID_PLAYER', args: [slot.name] })
  } else if (!isIntegerInRange(player.Dust, 0, MAX_DUST)) {
    issues.push({ code: 'PBZ_INVALID_DUST', args: [slot.name] })
  }

  const inventoryValue = slot.document.Inventory
  if (inventoryValue === undefined) return
  if (!isPlainObject(inventoryValue)) {
    issues.push({ code: 'PBZ_INVALID_INVENTORY', args: [slot.name] })
    return
  }

  const infosValue = inventoryValue.InventoryInfos
  if (infosValue === undefined) return
  if (!isPlainObject(infosValue)) {
    issues.push({ code: 'PBZ_INVALID_INVENTORY_INFOS', args: [slot.name] })
    return
  }

  for (const [id, value] of Object.entries(infosValue)) {
    const item = getPbzItem(id)
    if (!item) continue
    if (!isPlainObject(value)) {
      issues.push({
        code: item.category === 'weapon-material'
          ? 'PBZ_INVALID_MATERIAL'
          : 'PBZ_INVALID_INVENTORY_ITEM',
        args: [slot.name, id]
      })
      continue
    }

    const current = value.CurrentAmount
    const max = value.MaxAmount
    if (!isIntegerInRange(current, 0, item.maxAmount)) {
      issues.push({
        code: item.category === 'weapon-material'
          ? 'PBZ_INVALID_MATERIAL_AMOUNT'
          : 'PBZ_INVALID_INVENTORY_AMOUNT',
        args: [slot.name, id]
      })
    }
    if (
      !isSafeInteger(max) ||
      max < 0 ||
      (isSafeInteger(current) && max < current)
    ) {
      issues.push({
        code: item.category === 'weapon-material'
          ? 'PBZ_INVALID_MATERIAL_MAX'
          : 'PBZ_INVALID_INVENTORY_MAX',
        args: [slot.name, id]
      })
    }
  }
}

function hasValidDocumentStructure(document: Record<string, unknown>): boolean {
  const player = getRecord(document, 'Player')
  if (!player || !isIntegerInRange(player.Dust, 0, MAX_DUST)) return false

  const inventory = document.Inventory
  if (inventory === undefined) return true
  if (!isPlainObject(inventory)) return false

  const infos = inventory.InventoryInfos
  return infos === undefined || isPlainObject(infos)
}

function requireSlot(model: PbzSaveModel, name: string): PbzEditableSlot {
  if (!isEditableSlotName(name)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [name])
  }
  const slot = model.slots.find((candidate) => candidate.name === name)
  if (!slot) throw new ModuleError('PBZ_INVALID_EDIT', [name])
  return slot
}

function requireCatalogItem(id: string): PbzCatalogItem {
  const item = getPbzItem(id)
  if (!item) throw new ModuleError('PBZ_INVALID_EDIT', [id])
  return item
}

function requireAmount(item: PbzCatalogItem, amount: number, allowZero: boolean): void {
  const minimum = allowZero ? 0 : 1
  if (!isIntegerInRange(amount, minimum, item.maxAmount)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [item.id])
  }
}

function requireEditableInventoryItem(
  slot: PbzEditableSlot,
  item: PbzCatalogItem
): InventoryRecord {
  const infos = getInventoryInfos(slot.document)
  const existing = infos ? readProjectedInventoryItem(infos, item) : null
  if (!existing) throw new ModuleError('PBZ_INVALID_EDIT', [item.id])
  return existing
}

function applyInventoryAmount(
  slot: PbzEditableSlot,
  existing: InventoryRecord,
  value: number
): void {
  if (existing.currentAmount === value) return
  existing.record.CurrentAmount = value
  if (value > existing.maxAmount) existing.record.MaxAmount = value
  slot.dirty = true
}

function readProjectedInventoryItem(
  infos: Record<string, unknown>,
  item: PbzCatalogItem
): InventoryRecord | null {
  const value = infos[item.id]
  if (!isPlainObject(value)) return null
  if (
    !isIntegerInRange(value.CurrentAmount, 0, item.maxAmount) ||
    !isSafeInteger(value.MaxAmount) ||
    value.MaxAmount < value.CurrentAmount ||
    value.MaxAmount < 0
  ) {
    return null
  }
  return {
    record: value,
    currentAmount: value.CurrentAmount,
    maxAmount: value.MaxAmount
  }
}

function requireInventoryInfos(slot: PbzEditableSlot): Record<string, unknown> {
  const infos = getInventoryInfos(slot.document)
  if (!infos) throw new ModuleError('PBZ_INVALID_EDIT', [slot.name])
  return infos
}

function readAcquiredCycle(slot: PbzEditableSlot): number {
  const gameSystem = getRecord(slot.document, 'PBZGameSystem')
  if (gameSystem && isIntegerInRange(gameSystem.CycleCount, 0, Number.MAX_SAFE_INTEGER)) {
    return gameSystem.CycleCount
  }

  const infos = requireInventoryInfos(slot)
  const cycles = Object.values(infos).flatMap((value) => {
    if (!isPlainObject(value)) return []
    return isIntegerInRange(value.AcquiredCycle, 0, Number.MAX_SAFE_INTEGER)
      ? [value.AcquiredCycle]
      : []
  })
  if (cycles.length === 0) throw new ModuleError('PBZ_INVALID_EDIT', [slot.name])
  return Math.max(...cycles)
}

function getInventoryInfos(document: Record<string, unknown>): Record<string, unknown> | null {
  const inventory = getRecord(document, 'Inventory')
  return inventory ? getRecord(inventory, 'InventoryInfos') : null
}

function getRecord(
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const value = record[key]
  return isPlainObject(value) ? value : null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return isSafeInteger(value) && value >= min && value <= max
}
