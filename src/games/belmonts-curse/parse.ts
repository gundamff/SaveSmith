import { ModuleError } from '@sdk/error'
import { utf8Decode, utf8Encode } from '@sdk/session'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { projectState } from './model/saveModel'
import type { BelmontsCurseState } from './model/types'

export type { BelmontsCurseState } from './model/types'

export function parse(files: SlotBytes[]): BelmontsCurseState {
  const file = files[0]
  if (!file) throw new ModuleError('MISSING_FIELD', ['BuildSave_*.sav'])
  let root: unknown
  try {
    root = JSON.parse(utf8Decode(file.bytes))
  } catch {
    throw new ModuleError('INVALID_JSON', [file.relativePath])
  }
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    throw new ModuleError('INVALID_JSON', [file.relativePath])
  }
  return projectState(root as Record<string, unknown>, file.relativePath)
}

export function serialize(state: BelmontsCurseState): SerializedFile[] {
  const text = JSON.stringify(state.raw)
  return [{ relativePath: state.relativePath, bytes: utf8Encode(text) }]
}

export function validate(state: BelmontsCurseState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const p = state.player
  if (!Number.isFinite(p.level) || p.level < 1 || !Number.isInteger(p.level)) {
    issues.push({ code: 'BC_LEVEL', args: [p.level] })
  }
  const nonNegInt: Array<[string, number]> = [
    ['experienceCurrent', p.experienceCurrent],
    ['healthUpgradeFragmentCount', p.healthUpgradeFragmentCount],
    ['manaUpgradeFragmentCount', p.manaUpgradeFragmentCount],
    ['atkBonusUpgradeCount', p.atkBonusUpgradeCount],
    ['defBonusUpgradeCount', p.defBonusUpgradeCount],
    ['currentHealChargesCount', p.currentHealChargesCount],
    ['currentTheHermitDeathDefianceCount', p.currentTheHermitDeathDefianceCount]
  ]
  for (const [name, v] of nonNegInt) {
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      issues.push({ code: 'BC_SCALAR', args: [name, v] })
    }
  }
  for (const [name, v] of [
    ['currentHealth', p.currentHealth],
    ['currentMana', p.currentMana]
  ] as const) {
    if (!Number.isFinite(v) || v < 0) issues.push({ code: 'BC_SCALAR', args: [name, v] })
  }
  return issues
}
