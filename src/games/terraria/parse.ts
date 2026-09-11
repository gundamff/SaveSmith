import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { decryptPlr, encryptPlr } from './crypto/plrAes'
import { parsePlayer, serializePlayer, type TerrariaPlayerState } from './model/playerModel'

export type { TerrariaPlayerState }

const PLR = /\.plr$/i

export function parse(files: SlotBytes[]): TerrariaPlayerState {
  const f = files.find((x) => PLR.test(x.relativePath) && !/\.plr\.bak$/i.test(x.relativePath))
  if (!f) throw new ModuleError('MISSING_FIELD', ['.plr'])
  let plain: Uint8Array
  try {
    plain = decryptPlr(f.bytes)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('DECRYPT_FAILED', ['plr'])
  }
  return parsePlayer(plain, f.relativePath)
}

export function serialize(state: TerrariaPlayerState): SerializedFile[] {
  const plain = serializePlayer(state)
  return [{ relativePath: state.relativePath, bytes: encryptPlr(plain) }]
}

export function validate(state: TerrariaPlayerState): ValidationIssue[] {
  // Host aborts save on any issue — keep only hard blockers here.
  const issues: ValidationIssue[] = []
  if (!state.name || state.name.length > 20) {
    issues.push({ code: 'INVALID_NAME', args: [state.name.length] })
  }
  if (state.statLife > state.statLifeMax) {
    issues.push({ code: 'LIFE_OVER_MAX', args: [state.statLife, state.statLifeMax] })
  }
  if (state.statMana > state.statManaMax) {
    issues.push({ code: 'MANA_OVER_MAX', args: [state.statMana, state.statManaMax] })
  }
  return issues
}
