import { ModuleError } from '../../../sdk/error'
import type { ValidationIssue } from '../../../sdk/types'
import { getPbzBossDifficulty, pbzBossDifficultyName } from '../catalog/bossDifficulties'
import { isValidDurationSeconds } from './durationFormat'
import { isEditableSlotName } from './editableSlotName'

const MAX_COUNT = 99_999_999

export interface PbzDeathEditableSlot {
  name: string
  document: Record<string, unknown>
  dirty: boolean
}

export interface PbzDeathSaveModel {
  slots: PbzDeathEditableSlot[]
}

export interface BossRecordView {
  bossId: string
  difficultyKey: string
  deathCount: number
  killCount: number
  defeated: boolean
  bestTimeMs: number | null
}

export function projectDeathMeta(slot: PbzDeathEditableSlot): { diedTimes: number } {
  const meta = getRecord(slot.document, 'PBZDeathMeta')
  const diedTimes = meta?.DiedTimes
  return {
    diedTimes: isIntegerInRange(diedTimes, 0, MAX_COUNT) ? diedTimes : Number.NaN
  }
}

export function setDiedTimes(model: PbzDeathSaveModel, slotName: string, value: number): void {
  const slot = requireSlot(model, slotName)
  if (!isIntegerInRange(value, 0, MAX_COUNT)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  }
  const meta = getRecord(slot.document, 'PBZDeathMeta')
  if (!meta) throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  if (meta.DiedTimes === value) return
  meta.DiedTimes = value
  slot.dirty = true
}

export function projectBossRecords(slot: PbzDeathEditableSlot): BossRecordView[] {
  const root = getRecord(slot.document, 'BossRecord')
  if (!root) return []

  const rows: BossRecordView[] = []
  for (const bossId of Object.keys(root).sort()) {
    const boss = getRecord(root, bossId)
    if (!boss) continue
    const records = getRecord(boss, 'Records')
    if (!records) continue
    for (const difficultyKey of Object.keys(records).sort()) {
      const entry = getRecord(records, difficultyKey)
      if (!entry) continue
      const projected = projectDifficultyRecord(bossId, difficultyKey, entry)
      if (projected) rows.push(projected)
    }
  }
  return rows
}

export function setBossDeathCount(
  model: PbzDeathSaveModel,
  slotName: string,
  bossId: string,
  difficultyKey: string,
  deathCount: number
): void {
  const slot = requireSlot(model, slotName)
  if (!isIntegerInRange(deathCount, 0, MAX_COUNT)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  }

  const root = getRecord(slot.document, 'BossRecord')
  const boss = root ? getRecord(root, bossId) : null
  const records = boss ? getRecord(boss, 'Records') : null
  const entry = records ? getRecord(records, difficultyKey) : null
  if (!entry || !isIntegerInRange(entry.AttemptCount, 0, MAX_COUNT)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  }

  const killCount = readKillCount(entry)
  const attemptCount = deathCount + killCount
  if (!isIntegerInRange(attemptCount, killCount, MAX_COUNT)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  }
  if (entry.AttemptCount === attemptCount) return
  entry.AttemptCount = attemptCount
  slot.dirty = true
}

export function setBossDifficultyKey(
  model: PbzDeathSaveModel,
  slotName: string,
  bossId: string,
  fromKey: string,
  toKey: string
): void {
  const slot = requireSlot(model, slotName)
  if (fromKey === toKey) return

  if (!getPbzBossDifficulty(toKey)) {
    throw new ModuleError('PBZ_BOSS_DIFFICULTY_UNKNOWN', [pbzBossDifficultyName(toKey)])
  }

  const root = getRecord(slot.document, 'BossRecord')
  const boss = root ? getRecord(root, bossId) : null
  const records = boss ? getRecord(boss, 'Records') : null
  if (!records || !Object.prototype.hasOwnProperty.call(records, fromKey)) {
    throw new ModuleError('PBZ_BOSS_DIFFICULTY_MISSING', [
      bossId,
      pbzBossDifficultyName(fromKey)
    ])
  }
  if (Object.prototype.hasOwnProperty.call(records, toKey)) {
    throw new ModuleError('PBZ_BOSS_DIFFICULTY_CONFLICT', [
      bossId,
      pbzBossDifficultyName(fromKey),
      pbzBossDifficultyName(toKey)
    ])
  }

  records[toKey] = records[fromKey]
  delete records[fromKey]
  slot.dirty = true
}

export function setBossBestTimeSeconds(
  model: PbzDeathSaveModel,
  slotName: string,
  bossId: string,
  difficultyKey: string,
  seconds: number
): void {
  const slot = requireSlot(model, slotName)
  if (!isValidDurationSeconds(seconds)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  }

  const root = getRecord(slot.document, 'BossRecord')
  const boss = root ? getRecord(root, bossId) : null
  const records = boss ? getRecord(boss, 'Records') : null
  const entry = records ? getRecord(records, difficultyKey) : null
  if (!entry || !isIntegerInRange(entry.BestTimeMs, 0, Number.MAX_SAFE_INTEGER)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  }

  const next = seconds * 1000
  if (entry.BestTimeMs === next) return
  entry.BestTimeMs = next
  slot.dirty = true
}

export function collectBossRecordIssues(
  slot: PbzDeathEditableSlot,
  issues: ValidationIssue[]
): void {
  const meta = getRecord(slot.document, 'PBZDeathMeta')
  if (meta && meta.DiedTimes !== undefined && !isIntegerInRange(meta.DiedTimes, 0, MAX_COUNT)) {
    issues.push({ code: 'PBZ_INVALID_DIED_TIMES', args: [slot.name] })
  }

  const root = getRecord(slot.document, 'BossRecord')
  if (!root) return
  for (const [bossId, bossValue] of Object.entries(root)) {
    if (!isPlainObject(bossValue)) continue
    const records = getRecord(bossValue, 'Records')
    if (!records) continue
    for (const [difficultyKey, entryValue] of Object.entries(records)) {
      if (!isPlainObject(entryValue)) continue
      if (entryValue.AttemptCount === undefined) continue
      if (!isIntegerInRange(entryValue.AttemptCount, 0, MAX_COUNT)) {
        issues.push({ code: 'PBZ_INVALID_BOSS_RECORD', args: [slot.name, bossId] })
        continue
      }
      const kill = readOptionalKillCount(entryValue)
      if (kill !== null && entryValue.AttemptCount < kill) {
        issues.push({
          code: 'PBZ_INVALID_BOSS_RECORD',
          args: [slot.name, `${bossId}.${difficultyKey}`]
        })
      }
      if (
        entryValue.BestTimeMs !== undefined &&
        !isIntegerInRange(entryValue.BestTimeMs, 0, Number.MAX_SAFE_INTEGER)
      ) {
        issues.push({
          code: 'PBZ_INVALID_BOSS_BEST_TIME',
          args: [slot.name, `${bossId}.${difficultyKey}`]
        })
      }
    }
  }
}

function projectDifficultyRecord(
  bossId: string,
  difficultyKey: string,
  entry: Record<string, unknown>
): BossRecordView | null {
  if (!isIntegerInRange(entry.AttemptCount, 0, MAX_COUNT)) return null
  const killCount = readKillCount(entry)
  if (entry.AttemptCount < killCount) return null
  const bestTimeMs = isIntegerInRange(entry.BestTimeMs, 0, Number.MAX_SAFE_INTEGER)
    ? entry.BestTimeMs
    : null
  return {
    bossId,
    difficultyKey,
    deathCount: entry.AttemptCount - killCount,
    killCount,
    defeated: killCount >= 1,
    bestTimeMs
  }
}

function readKillCount(entry: Record<string, unknown>): number {
  return readOptionalKillCount(entry) ?? 0
}

function readOptionalKillCount(entry: Record<string, unknown>): number | null {
  if (entry.KillCount === undefined) return null
  return isIntegerInRange(entry.KillCount, 0, MAX_COUNT) ? entry.KillCount : null
}

function requireSlot(model: PbzDeathSaveModel, name: string): PbzDeathEditableSlot {
  if (!isEditableSlotName(name)) {
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
