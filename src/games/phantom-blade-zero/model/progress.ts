import { ModuleError } from '../../../sdk/error'
import type { ValidationIssue } from '../../../sdk/types'
import { isValidDurationSeconds } from './durationFormat'

const MAX_CYCLE_COUNT = 99
const EDITABLE_SLOT_NAME = /^(?:AutoSave|ManualSave)\d+$/

export interface PbzProgressEditableSlot {
  name: string
  document: Record<string, unknown>
  dirty: boolean
}

export interface PbzProgressSaveModel {
  slots: PbzProgressEditableSlot[]
}

export interface ProgressView {
  cycleCount: number
  cycleDisplay: number
  gameTimeSeconds: number
  hasGameTime: number | null
  currentCycleGameTime: number | null
  timesMismatch: boolean
  cycleRecordCount: number
  cycleEditable: boolean
  gameTimeEditable: boolean
  hasGameSystem: boolean
}

export function projectProgress(slot: PbzProgressEditableSlot): ProgressView {
  const system = getRecord(slot.document, 'PBZGameSystem')
  const hasGameSystem = system !== null

  const rawCycleCount = system?.CycleCount
  const cycleEditable =
    system !== null &&
    rawCycleCount !== undefined &&
    isIntegerInRange(rawCycleCount, 0, MAX_CYCLE_COUNT)
  const cycleCount = cycleEditable ? rawCycleCount : Number.NaN
  const cycleDisplay = Number.isFinite(cycleCount) ? cycleCount + 1 : Number.NaN

  const hasGameTime = readOptionalNumber(system?.HasGameTime)
  const currentCycleGameTime = readOptionalNumber(system?.CurrentCycleGameTime)
  const gameTimeEditable =
    system !== null &&
    isValidDurationSeconds(system.HasGameTime) &&
    isValidDurationSeconds(system.CurrentCycleGameTime)
  const gameTimeSeconds = gameTimeEditable ? (system!.CurrentCycleGameTime as number) : Number.NaN
  const timesMismatch =
    typeof system?.HasGameTime === 'number' &&
    typeof system?.CurrentCycleGameTime === 'number' &&
    system.HasGameTime !== system.CurrentCycleGameTime

  let cycleRecordCount = 0
  if (system) {
    const records = system.CycleRecords
    if (isPlainObject(records)) {
      cycleRecordCount = Object.keys(records).length
    }
  }

  return {
    cycleCount,
    cycleDisplay,
    gameTimeSeconds,
    hasGameTime,
    currentCycleGameTime,
    timesMismatch,
    cycleRecordCount,
    cycleEditable,
    gameTimeEditable,
    hasGameSystem
  }
}

export function setCycleDisplay(
  model: PbzProgressSaveModel,
  slotName: string,
  displayWeek: number
): void {
  const slot = requireSlot(model, slotName)
  const system = getRecord(slot.document, 'PBZGameSystem')
  if (!system || !isIntegerInRange(system.CycleCount, 0, MAX_CYCLE_COUNT)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }
  if (!isIntegerInRange(displayWeek, 1, MAX_CYCLE_COUNT + 1)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }

  const nextCount = displayWeek - 1
  if (system.CycleCount === nextCount) return
  system.CycleCount = nextCount
  slot.dirty = true
}

export function setGameTimeSeconds(
  model: PbzProgressSaveModel,
  slotName: string,
  seconds: number
): void {
  const slot = requireSlot(model, slotName)
  const system = getRecord(slot.document, 'PBZGameSystem')
  if (
    !system ||
    !isValidDurationSeconds(system.HasGameTime) ||
    !isValidDurationSeconds(system.CurrentCycleGameTime)
  ) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }
  if (!isValidDurationSeconds(seconds)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }

  if (system.HasGameTime === seconds && system.CurrentCycleGameTime === seconds) return
  system.HasGameTime = seconds
  system.CurrentCycleGameTime = seconds
  slot.dirty = true
}

export function collectProgressIssues(
  slot: PbzProgressEditableSlot,
  issues: ValidationIssue[]
): void {
  const system = getRecord(slot.document, 'PBZGameSystem')
  if (!system) return

  if (
    system.CycleCount !== undefined &&
    !isIntegerInRange(system.CycleCount, 0, MAX_CYCLE_COUNT)
  ) {
    issues.push({ code: 'PBZ_INVALID_CYCLE_COUNT', args: [slot.name] })
  }
  if (system.HasGameTime !== undefined && !isValidDurationSeconds(system.HasGameTime)) {
    issues.push({ code: 'PBZ_INVALID_GAME_TIME', args: [slot.name] })
  }
  if (
    system.CurrentCycleGameTime !== undefined &&
    !isValidDurationSeconds(system.CurrentCycleGameTime)
  ) {
    issues.push({ code: 'PBZ_INVALID_GAME_TIME', args: [slot.name] })
  }
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function requireSlot(model: PbzProgressSaveModel, name: string): PbzProgressEditableSlot {
  if (!EDITABLE_SLOT_NAME.test(name)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [name])
  }
  const slot = model.slots.find((candidate) => candidate.name === name)
  if (!slot) throw new ModuleError('PBZ_INVALID_EDIT', [name])
  return slot
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
