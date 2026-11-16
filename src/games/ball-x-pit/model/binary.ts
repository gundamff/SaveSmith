import { ModuleError } from '@sdk/error'

export const SAVE_ROOT = 'MetaSaveData, Assembly-CSharp'

export const SAVE_SECTION_FIELDS = [
  'Buildings',
  'Chars',
  'Blueprints',
  'HeroStats',
  'PassiveStats',
  'NumHarvests',
  'NumBossBlueprintsDropped'
] as const

export function encodeFieldName(name: string): Uint8Array {
  const out = new Uint8Array(4 + name.length * 2)
  const view = new DataView(out.buffer)
  view.setUint32(0, name.length, true)
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i)
    out[4 + i * 2] = c & 0xff
    out[4 + i * 2 + 1] = (c >> 8) & 0xff
  }
  return out
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0, to = haystack.length): number {
  const end = Math.min(to, haystack.length) - needle.length
  outer: for (let i = from; i <= end; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

export function findAllFieldOffsets(
  data: Uint8Array,
  name: string,
  start = 0,
  end = data.length
): number[] {
  const needle = encodeFieldName(name)
  const out: number[] = []
  let cursor = start
  while (cursor < end) {
    const at = indexOfBytes(data, needle, cursor, end)
    if (at < 0) break
    out.push(at)
    cursor = at + needle.length
  }
  return out
}

export function findUniqueField(data: Uint8Array, name: string, start = 0, end = data.length): number {
  const all = findAllFieldOffsets(data, name, start, end)
  if (all.length !== 1) {
    throw new ModuleError('BXP_FIELD_COUNT', [name, all.length])
  }
  return all[0]!
}

export function fieldValueOffset(_data: Uint8Array, fieldOffset: number, name: string): number {
  return fieldOffset + encodeFieldName(name).length
}

export function readI32(data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) throw new ModuleError('BXP_TRUNCATED', [offset])
  return new DataView(data.buffer, data.byteOffset + offset, 4).getInt32(0, true)
}

export function writeI32(data: Uint8Array, offset: number, value: number): void {
  if (offset + 4 > data.length) throw new ModuleError('BXP_TRUNCATED', [offset])
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new ModuleError('BXP_INT32_RANGE', [value])
  }
  new DataView(data.buffer, data.byteOffset + offset, 4).setInt32(0, value, true)
}

/** Validate BinaryFormatter-ish envelope used by write path. */
export function validateEnvelope(data: Uint8Array): void {
  if (!data.length || data[0] !== 0x02) {
    throw new ModuleError('BXP_BAD_HEADER', [])
  }
  if (data[data.length - 1] !== 0x05) {
    throw new ModuleError('BXP_BAD_TERMINATOR', [])
  }
  const root = findUniqueField(data, SAVE_ROOT)
  const offsets = SAVE_SECTION_FIELDS.map((name) => findUniqueField(data, name))
  const ordered = [root, ...offsets]
  const sorted = [...ordered].sort((a, b) => a - b)
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i] !== sorted[i]) {
      throw new ModuleError('BXP_SECTION_ORDER', [])
    }
  }
  const terminalName = SAVE_SECTION_FIELDS[SAVE_SECTION_FIELDS.length - 1]!
  const terminalField = encodeFieldName(terminalName)
  const terminalAt = offsets[offsets.length - 1]!
  const afterName = terminalAt + terminalField.length
  if (afterName + 5 !== data.length) {
    throw new ModuleError('BXP_TRAILING', [data.length - (afterName + 4)])
  }
}

export interface IntArrayRef {
  /** offset of 0x08 */
  headerOffset: number
  count: number
  /** offset of values[0] (first int32 after count) */
  valuesOffset: number
}

/**
 * Find unique int32[] near a field: `08 | count | values[count]`.
 * Window is [fieldEnd, fieldEnd + window).
 */
export function findIntArrayNearField(
  data: Uint8Array,
  fieldOffset: number,
  name: string,
  window: number,
  opts?: { requireMarker4?: boolean; expectedCount?: number }
): IntArrayRef {
  const fieldEnd = fieldValueOffset(data, fieldOffset, name)
  const searchEnd = Math.min(data.length, fieldEnd + window)
  const candidates: IntArrayRef[] = []
  for (let h = fieldEnd; h + 9 <= searchEnd; h++) {
    if (data[h] !== 0x08) continue
    const count = readI32(data, h + 1)
    if (count < 1 || count > 1000) continue
    const valuesOffset = h + 5
    if (valuesOffset + count * 4 > data.length) continue
    if (opts?.requireMarker4 && readI32(data, valuesOffset) !== 4) continue
    if (opts?.expectedCount !== undefined && count !== opts.expectedCount) continue
    candidates.push({ headerOffset: h, count, valuesOffset })
  }
  if (candidates.length !== 1) {
    throw new ModuleError('BXP_ARRAY_CANDIDATES', [name, candidates.length])
  }
  return candidates[0]!
}
