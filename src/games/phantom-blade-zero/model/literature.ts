import { ModuleError } from '../../../sdk/error'
import {
  getPbzCodexBookById,
  isWhitelistedCodexBookId,
  listPbzCodexBookPages,
  listPbzCodexBooks,
  pbzCodexBooks,
  type PbzCodexBookEntry
} from '../catalog/codexBooks'
import {
  getPbzCodexMemoryById,
  isWhitelistedCodexMemoryId,
  listPbzCodexMemories,
  listPbzCodexMemoryPetals,
  pbzCodexMemories,
  type PbzCodexMemoryEntry
} from '../catalog/codexMemories'
import { formatPbzTime } from './inventoryRecord'
import type { PbzEditableSlot, PbzSaveModel } from './saveModel'

export interface PbzLiteratureRowView {
  id: string
  zh: string
  en: string
  ownMapId: string
  parentId: string
  kind: string
  owned: boolean
  displayOrder: number
}

export interface PbzLiteratureView {
  total: number
  ownedCount: number
  rows: PbzLiteratureRowView[]
}

export function projectCodexBooks(slot: PbzEditableSlot): PbzLiteratureView {
  const owned = readOwnedIds(slot)
  const rows = listPbzCodexBooks().map((row) => toBookRow(row, owned))
  return {
    total: pbzCodexBooks.length,
    ownedCount: rows.filter((r) => r.owned).length,
    rows
  }
}

export function projectCodexMemories(slot: PbzEditableSlot): PbzLiteratureView {
  const owned = readOwnedIds(slot)
  const rows = listPbzCodexMemories().map((row) => toMemoryRow(row, owned))
  return {
    total: pbzCodexMemories.length,
    ownedCount: rows.filter((r) => r.owned).length,
    rows
  }
}

/** Toggle a book/page. Turning a book on also grants its pages; off removes book+pages. */
export function setCodexBookOwned(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  on: boolean,
  now = new Date()
): void {
  const row = getPbzCodexBookById(id)
  if (!row || !isWhitelistedCodexBookId(id)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  const slot = requireEditableSlot(model, slotName)
  const ids = row.kind === 'book' ? [row.id, ...listPbzCodexBookPages(row.id).map((p) => p.id)] : [row.id]
  applyOwnership(slot, ids, on, now)
}

/** Toggle a flower/petal. Turning a flower on also grants petals; off removes flower+petals. */
export function setCodexMemoryOwned(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  on: boolean,
  now = new Date()
): void {
  const row = getPbzCodexMemoryById(id)
  if (!row || !isWhitelistedCodexMemoryId(id)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [id])
  }
  const slot = requireEditableSlot(model, slotName)
  const ids =
    row.kind === 'flower' ? [row.id, ...listPbzCodexMemoryPetals(row.id).map((p) => p.id)] : [row.id]
  applyOwnership(slot, ids, on, now)
}

export function unlockAllCodexBooks(model: PbzSaveModel, slotName: string, now = new Date()): void {
  const slot = requireEditableSlot(model, slotName)
  applyOwnership(
    slot,
    pbzCodexBooks.map((row) => row.id),
    true,
    now
  )
}

export function clearAllCodexBooks(model: PbzSaveModel, slotName: string): void {
  const slot = requireEditableSlot(model, slotName)
  applyOwnership(
    slot,
    pbzCodexBooks.map((row) => row.id),
    false,
    new Date()
  )
}

export function unlockAllCodexMemories(
  model: PbzSaveModel,
  slotName: string,
  now = new Date()
): void {
  const slot = requireEditableSlot(model, slotName)
  applyOwnership(
    slot,
    pbzCodexMemories.map((row) => row.id),
    true,
    now
  )
}

export function clearAllCodexMemories(model: PbzSaveModel, slotName: string): void {
  const slot = requireEditableSlot(model, slotName)
  applyOwnership(
    slot,
    pbzCodexMemories.map((row) => row.id),
    false,
    new Date()
  )
}

function applyOwnership(
  slot: PbzEditableSlot,
  ids: readonly string[],
  on: boolean,
  now: Date
): void {
  const infos = requireInventoryInfos(slot)
  const cycle = readAcquiredCycle(slot)
  let changed = false
  for (const id of ids) {
    if (on) {
      if (Object.prototype.hasOwnProperty.call(infos, id)) {
        const existing = infos[id]
        if (isPlainObject(existing) && existing.CurrentAmount !== 1) {
          existing.CurrentAmount = 1
          existing.MaxAmount = Math.max(1, Number(existing.MaxAmount) || 1)
          existing.DirtyTime = formatPbzTime(now)
          changed = true
        }
        continue
      }
      const stamp = formatPbzTime(now)
      infos[id] = {
        CurrentAmount: 1,
        MaxAmount: 1,
        FirstAddTime: stamp,
        DirtyTime: stamp,
        AcquiredCycle: cycle
      }
      changed = true
    } else if (Object.prototype.hasOwnProperty.call(infos, id)) {
      delete infos[id]
      changed = true
    }
  }
  if (changed) slot.dirty = true
}

function readOwnedIds(slot: PbzEditableSlot): Set<string> {
  const infos = getInventoryInfos(slot.document)
  if (!infos) return new Set()
  const owned = new Set<string>()
  for (const [id, value] of Object.entries(infos)) {
    if (!isPlainObject(value)) continue
    if (typeof value.CurrentAmount === 'number' && value.CurrentAmount > 0) owned.add(id)
  }
  return owned
}

function toBookRow(row: PbzCodexBookEntry, owned: Set<string>): PbzLiteratureRowView {
  return {
    id: row.id,
    zh: row.zh,
    en: row.en,
    ownMapId: row.ownMapId,
    parentId: row.parentId,
    kind: row.kind,
    owned: owned.has(row.id),
    displayOrder: row.displayOrder
  }
}

function toMemoryRow(row: PbzCodexMemoryEntry, owned: Set<string>): PbzLiteratureRowView {
  return {
    id: row.id,
    zh: row.zh,
    en: row.en,
    ownMapId: row.ownMapId,
    parentId: row.parentId,
    kind: row.kind,
    owned: owned.has(row.id),
    displayOrder: row.displayOrder
  }
}

function requireEditableSlot(model: PbzSaveModel, slotName: string): PbzEditableSlot {
  const slot = model.slots.find((s) => s.name === slotName)
  if (!slot) throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  return slot
}

function requireInventoryInfos(slot: PbzEditableSlot): Record<string, unknown> {
  const infos = getInventoryInfos(slot.document)
  if (!infos) throw new ModuleError('PBZ_INVALID_EDIT', [slot.name])
  return infos
}

function getInventoryInfos(document: Record<string, unknown>): Record<string, unknown> | null {
  const inventory = asRecord(document.Inventory)
  return inventory ? asRecord(inventory.InventoryInfos) : null
}

function readAcquiredCycle(slot: PbzEditableSlot): number {
  const gameSystem = asRecord(slot.document.PBZGameSystem)
  if (gameSystem && typeof gameSystem.CycleCount === 'number' && Number.isInteger(gameSystem.CycleCount)) {
    return gameSystem.CycleCount
  }
  const infos = requireInventoryInfos(slot)
  const cycles = Object.values(infos).flatMap((value) => {
    if (!isPlainObject(value)) return []
    return typeof value.AcquiredCycle === 'number' && Number.isInteger(value.AcquiredCycle)
      ? [value.AcquiredCycle]
      : []
  })
  if (cycles.length === 0) return 0
  return Math.max(...cycles)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
