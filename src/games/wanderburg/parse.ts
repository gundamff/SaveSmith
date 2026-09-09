import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'

export interface WanderburgState {
  readonly _stub: true
}

function decryptNotReady(): never {
  throw new ModuleError('DECRYPT_FAILED', [])
}

export function parse(_files: SlotBytes[]): WanderburgState {
  decryptNotReady()
}

export function serialize(_state: WanderburgState): SerializedFile[] {
  decryptNotReady()
}

export function validate(_state: WanderburgState): ValidationIssue[] {
  return []
}
