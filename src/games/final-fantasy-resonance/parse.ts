import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { decryptSvhd, encryptSvhd } from './crypto/svhd'
import { padAes, parseGvasIndex } from './model/gvasIndex'
import { projectState } from './model/saveModel'
import type { FinalFantasyResonanceState } from './model/types'

export type { FinalFantasyResonanceState }

export function parse(files: SlotBytes[]): FinalFantasyResonanceState {
  const file = files[0]
  if (!file) throw new ModuleError('MISSING_FIELD', ['GameSaveData*.sav'])
  const { header, plain } = decryptSvhd(file.bytes)
  if (plain.length < 4 || String.fromCharCode(plain[0]!, plain[1]!, plain[2]!, plain[3]!) !== 'GVAS') {
    throw new ModuleError('INVALID_FORMAT', ['GVAS'])
  }
  return projectState(file.relativePath, header, plain)
}

export function serialize(state: FinalFantasyResonanceState): SerializedFile[] {
  // Prefer original buffer length when edits stayed in-place (keeps AES frame stable).
  const end = Math.max(state.index.end, state.plain.length)
  const body = state.plain.length % 16 === 0 && state.plain.length >= state.index.end
    ? state.plain
    : padAes(state.plain, end)
  return [{ relativePath: state.relativePath, bytes: encryptSvhd(state.header, body) }]
}

export function validate(state: FinalFantasyResonanceState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!Number.isFinite(state.currentMoney) || state.currentMoney < 0) {
    issues.push({ code: 'FFR_MONEY', args: [state.currentMoney] })
  }
  for (const row of state.inventory) {
    if (!Number.isInteger(row.num) || row.num < 0 || row.num > 99) {
      issues.push({ code: 'FFR_ITEM_NUM', args: [row.itemId, row.num] })
    }
  }
  try {
    parseGvasIndex(state.plain)
  } catch {
    issues.push({ code: 'FFR_GVAS', args: [] })
  }
  return issues
}
