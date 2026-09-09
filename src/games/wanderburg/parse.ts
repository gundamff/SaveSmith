import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { decryptSaveBytesToUtf8, encryptUtf8ToSaveBytes } from './crypto/mmJsonEncrypted'
import { MM_KEY } from './crypto/keys'

export interface WanderburgState {
  relativePath: string
  doc: Record<string, unknown>
}

export function parse(files: SlotBytes[]): WanderburgState {
  const f = files.find((x) => /SaveData\.json$/i.test(x.relativePath))
  if (!f) throw new ModuleError('MISSING_FIELD', ['SaveData.json'])
  let text: string
  try {
    text = decryptSaveBytesToUtf8(f.bytes, MM_KEY)
  } catch {
    throw new ModuleError('DECRYPT_FAILED', [])
  }
  let doc: Record<string, unknown>
  try {
    doc = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new ModuleError('DECRYPT_FAILED', [])
  }
  return { relativePath: f.relativePath, doc }
}

export function serialize(state: WanderburgState): SerializedFile[] {
  const plain = JSON.stringify(state.doc)
  const bytes = encryptUtf8ToSaveBytes(plain, MM_KEY)
  const files: SerializedFile[] = [{ relativePath: state.relativePath, bytes }]
  // Game recovers from SaveData.backup.json when primary decrypt fails — keep it in sync.
  if (/SaveData\.json$/i.test(state.relativePath)) {
    files.push({
      relativePath: state.relativePath.replace(/SaveData\.json$/i, 'SaveData.backup.json'),
      bytes
    })
  }
  return files
}

export function validate(_state: WanderburgState): ValidationIssue[] {
  return []
}
