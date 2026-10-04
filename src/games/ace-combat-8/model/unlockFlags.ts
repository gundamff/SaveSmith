import { ModuleError } from '@sdk/error'

/** UnlockData entry used for Ace difficulty (see ac8-save-editor UnlockAce). */
export const ACE_DIFFICULTY_UNLOCK_ID = 1800001

/** UE5-style BoolProperty tag flag: value stored in header flags, not payload. */
const BOOL_TRUE_FLAG = 0x10

const BIS_ACTIVATED = new TextEncoder().encode('bIsActivated\0')
const BOOL_PROPERTY = new TextEncoder().encode('BoolProperty\0')

function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from: number, to: number): number {
  outer: for (let i = from; i <= to - needle.length; i++) {
    for (let k = 0; k < needle.length; k++) {
      if (hay[i + k] !== needle[k]) continue outer
    }
    return i
  }
  return -1
}

function findAceBoolFlagsOffset(bytes: Uint8Array): number {
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (
      bytes[i] !== (ACE_DIFFICULTY_UNLOCK_ID & 0xff) ||
      bytes[i + 1] !== ((ACE_DIFFICULTY_UNLOCK_ID >>> 8) & 0xff) ||
      bytes[i + 2] !== ((ACE_DIFFICULTY_UNLOCK_ID >>> 16) & 0xff) ||
      bytes[i + 3] !== ((ACE_DIFFICULTY_UNLOCK_ID >>> 24) & 0xff)
    ) {
      continue
    }
    const windowEnd = Math.min(bytes.length, i + 96)
    const act = indexOfBytes(bytes, BIS_ACTIVATED, i, windowEnd)
    if (act < 0) continue
    const bp = indexOfBytes(bytes, BOOL_PROPERTY, act, windowEnd)
    if (bp < 0) continue
    const flagsOff = bp + BOOL_PROPERTY.length + 8
    if (flagsOff >= bytes.length) continue
    return flagsOff
  }
  return -1
}

/** Activate UnlockData entry 1800001 (bIsActivated). */
export function activateAceUnlockEntry(bytes: Uint8Array): void {
  const flagsOff = findAceBoolFlagsOffset(bytes)
  if (flagsOff < 0) throw new ModuleError('MISSING_FIELD', [`UnlockData:${ACE_DIFFICULTY_UNLOCK_ID}`])
  bytes[flagsOff] = (bytes[flagsOff]! | BOOL_TRUE_FLAG) & 0xff
}

export function isAceUnlockEntryActive(bytes: Uint8Array): boolean {
  const flagsOff = findAceBoolFlagsOffset(bytes)
  if (flagsOff < 0) return false
  return ((bytes[flagsOff] ?? 0) & BOOL_TRUE_FLAG) !== 0
}
