/**
 * uint64 bitmask helpers stored as decimal strings.
 *
 * Public format: SQLite INTEGER is signed int64; the game reads BIT_FIELD as uint64.
 * https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Category/bit mapping (switchKey / 64, switchKey % 64) is documented there;
 * this module only flips bits on a single 64-bit word.
 */

function toUint64(bitField: string): bigint {
  return BigInt.asUintN(64, BigInt(bitField))
}

function toInt64String(value: bigint): string {
  return BigInt.asIntN(64, value).toString()
}

export function hasBit(bitField: string, bit: number): boolean {
  if (bit < 0 || bit > 63) return false
  return (toUint64(bitField) & (1n << BigInt(bit))) !== 0n
}

export function setBit(bitField: string, bit: number, value: boolean): string {
  if (bit < 0 || bit > 63) return toInt64String(toUint64(bitField))
  const mask = 1n << BigInt(bit)
  const next = value ? toUint64(bitField) | mask : toUint64(bitField) & ~mask
  return toInt64String(next)
}
