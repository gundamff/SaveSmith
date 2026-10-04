import { ModuleError } from '@sdk/error'

const textEncoder = new TextEncoder()

export type GvasScalarType = 'UInt64Property' | 'UInt32Property' | 'IntProperty' | 'BoolProperty'

export interface GvasScalarField {
  name: string
  type: GvasScalarType
  valueOffset: number
  size: number
}

export interface GvasInt32ArrayField {
  name: string
  /** Offset of the data-size Int32 (count + elements). */
  dataSizeOffset: number
  /** Offset of array element count (Int32). */
  countOffset: number
  /** First element Int32. */
  dataOffset: number
  count: number
  /** Byte index after last element. */
  blockEnd: number
}

/** ArrayProperty&lt;ByteProperty&gt; payload (AC8 PackedData). */
export interface GvasByteArrayField {
  name: string
  dataSizeOffset: number
  countOffset: number
  dataOffset: number
  count: number
  blockEnd: number
}

/** AC8 Live save seal: CRC32(PackedData bytes, seed 0x41916EBD). */
export const AC8_CHECKSUM_SEED = 0x41916ebd

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

/** CRC32 over nested PackedData bytes. Init = ~seed, final XOR = ~0. */
export function computePackedChecksum(data: Uint8Array): number {
  let c = ~AC8_CHECKSUM_SEED >>> 0
  for (let i = 0; i < data.length; i++) {
    c = CRC32_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function readAscii(bytes: Uint8Array, offset: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[offset + i]!)
  return s
}

function readNameAt(bytes: Uint8Array, offset: number): { name: string; next: number } | null {
  if (offset + 4 > bytes.length) return null
  const len = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(offset, true)
  if (len <= 0 || offset + 4 + len > bytes.length) return null
  const name = readAscii(bytes, offset + 4, len - 1)
  if (bytes[offset + 4 + len - 1] !== 0) return null
  return { name, next: offset + 4 + len }
}

function parseScalarAt(
  bytes: Uint8Array,
  nameOffset: number,
  name: string,
  expectedType?: GvasScalarType
): GvasScalarField | null {
  const namePart = readNameAt(bytes, nameOffset)
  if (!namePart || namePart.name !== name) return null
  const typePart = readNameAt(bytes, namePart.next)
  if (!typePart) return null
  const type = typePart.name as GvasScalarType
  if (
    type !== 'UInt64Property' &&
    type !== 'UInt32Property' &&
    type !== 'IntProperty' &&
    type !== 'BoolProperty'
  ) {
    return null
  }
  if (expectedType && type !== expectedType) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cursor = typePart.next
  if (cursor + 9 > bytes.length) return null
  // UE 5.4 TypeName: after the type FString comes Inner.Count (0 for scalars), then Size, TagFlags.
  const innerCount = view.getInt32(cursor, true)
  cursor += 4
  const size = view.getInt32(cursor, true)
  cursor += 4
  const tagFlags = bytes[cursor]
  cursor += 1
  if (innerCount !== 0 || tagFlags !== 0) return null
  if (type === 'UInt64Property' && size !== 8) return null
  if ((type === 'UInt32Property' || type === 'IntProperty') && size !== 4) return null
  if (type === 'BoolProperty' && size !== 1) return null
  if (cursor + size > bytes.length) return null
  return { name, type, valueOffset: cursor, size }
}

/** Find first top-level scalar by property name (FName + type header). */
export function findScalarProperty(
  bytes: Uint8Array,
  name: string,
  expectedType?: GvasScalarType
): GvasScalarField | null {
  const needle = textEncoder.encode(`${name}\0`)
  for (let i = 4; i <= bytes.length - needle.length; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const nameLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
      i - 4,
      true
    )
    if (nameLen !== needle.length) continue
    const field = parseScalarAt(bytes, i - 4, name, expectedType)
    if (field) return field
  }
  return null
}

export function readUInt64(bytes: Uint8Array, offset: number): bigint {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getBigUint64(offset, true)
}

export function writeUInt64(bytes: Uint8Array, offset: number, value: bigint): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setBigUint64(offset, value, true)
}

export function readUInt32(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getUint32(offset, true)
}

export function writeUInt32(bytes: Uint8Array, offset: number, value: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setUint32(offset, value >>> 0, true)
}

export function readInt32(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getInt32(offset, true)
}

export function writeInt32(bytes: Uint8Array, offset: number, value: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setInt32(offset, value, true)
}

type NumericArrayInner = 'IntProperty' | 'UInt32Property'

/**
 * ArrayProperty&lt;IntProperty|UInt32Property&gt; UE 5.4:
 *   name, ArrayProperty, Inner.Count=1, innerType, inner.Inner=0,
 *   Size(=4+n*4), TagFlags=0, count, values
 */
function parseNumericArrayAt(
  bytes: Uint8Array,
  nameOffset: number,
  name: string,
  innerType: NumericArrayInner
): GvasInt32ArrayField | null {
  const namePart = readNameAt(bytes, nameOffset)
  if (!namePart || namePart.name !== name) return null
  const typePart = readNameAt(bytes, namePart.next)
  if (!typePart || typePart.name !== 'ArrayProperty') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cursor = typePart.next
  if (cursor + 4 > bytes.length) return null
  cursor += 4 // TypeName Inner.Count (1)
  const inner = readNameAt(bytes, cursor)
  if (!inner || inner.name !== innerType) return null
  cursor = inner.next
  if (cursor + 9 > bytes.length) return null
  const pad = view.getInt32(cursor, true)
  cursor += 4
  const dataSizeOffset = cursor
  const dataSize = view.getInt32(cursor, true)
  cursor += 4
  const hasGuid = bytes[cursor]
  cursor += 1
  if (pad !== 0 || hasGuid !== 0) return null
  const countOffset = cursor
  const count = view.getInt32(cursor, true)
  cursor += 4
  if (count < 0 || dataSize !== 4 + count * 4) return null
  if (cursor + count * 4 > bytes.length) return null
  return {
    name,
    dataSizeOffset,
    countOffset,
    dataOffset: cursor,
    count,
    blockEnd: cursor + count * 4
  }
}

function findNumericArrayProperty(
  bytes: Uint8Array,
  name: string,
  innerType: NumericArrayInner
): GvasInt32ArrayField | null {
  const needle = textEncoder.encode(`${name}\0`)
  for (let i = 4; i <= bytes.length - needle.length; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const nameLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
      i - 4,
      true
    )
    if (nameLen !== needle.length) continue
    const field = parseNumericArrayAt(bytes, i - 4, name, innerType)
    if (field) return field
  }
  return null
}

/** First ArrayProperty&lt;IntProperty&gt; with matching name. */
export function findInt32ArrayProperty(bytes: Uint8Array, name: string): GvasInt32ArrayField | null {
  return findNumericArrayProperty(bytes, name, 'IntProperty')
}

/** First ArrayProperty&lt;UInt32Property&gt; with matching name. */
export function findUInt32ArrayProperty(bytes: Uint8Array, name: string): GvasInt32ArrayField | null {
  return findNumericArrayProperty(bytes, name, 'UInt32Property')
}

/**
 * ArrayProperty&lt;ByteProperty&gt; UE 5.4 (PackedData):
 *   name, ArrayProperty, Inner.Count=1, ByteProperty, inner=0,
 *   Size(=4+count), TagFlags=0, count, bytes
 */
function parseByteArrayAt(bytes: Uint8Array, nameOffset: number, name: string): GvasByteArrayField | null {
  const namePart = readNameAt(bytes, nameOffset)
  if (!namePart || namePart.name !== name) return null
  const typePart = readNameAt(bytes, namePart.next)
  if (!typePart || typePart.name !== 'ArrayProperty') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cursor = typePart.next
  if (cursor + 4 > bytes.length) return null
  cursor += 4 // TypeName Inner.Count (1)
  const inner = readNameAt(bytes, cursor)
  if (!inner || inner.name !== 'ByteProperty') return null
  cursor = inner.next
  if (cursor + 9 > bytes.length) return null
  const pad = view.getInt32(cursor, true)
  cursor += 4
  const dataSizeOffset = cursor
  const dataSize = view.getInt32(cursor, true)
  cursor += 4
  const hasGuid = bytes[cursor]
  cursor += 1
  if (pad !== 0 || hasGuid !== 0) return null
  const countOffset = cursor
  const count = view.getInt32(cursor, true)
  cursor += 4
  if (count < 0 || dataSize !== 4 + count) return null
  if (cursor + count > bytes.length) return null
  return {
    name,
    dataSizeOffset,
    countOffset,
    dataOffset: cursor,
    count,
    blockEnd: cursor + count
  }
}

export function findByteArrayProperty(bytes: Uint8Array, name: string): GvasByteArrayField | null {
  const needle = textEncoder.encode(`${name}\0`)
  for (let i = 4; i <= bytes.length - needle.length; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const nameLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
      i - 4,
      true
    )
    if (nameLen !== needle.length) continue
    const field = parseByteArrayAt(bytes, i - 4, name)
    if (field) return field
  }
  return null
}

export function readInt32Array(bytes: Uint8Array, field: GvasInt32ArrayField): number[] {
  const out: number[] = []
  for (let i = 0; i < field.count; i++) {
    out.push(readInt32(bytes, field.dataOffset + i * 4))
  }
  return out
}

export function readUInt32Array(bytes: Uint8Array, field: GvasInt32ArrayField): number[] {
  const out: number[] = []
  for (let i = 0; i < field.count; i++) {
    out.push(readUInt32(bytes, field.dataOffset + i * 4))
  }
  return out
}

function writeNumericArray(
  bytes: Uint8Array,
  field: GvasInt32ArrayField,
  values: number[],
  writeValue: (buf: Uint8Array, offset: number, value: number) => void
): Uint8Array {
  const newDataSize = 4 + values.length * 4
  const delta = (values.length - field.count) * 4
  if (delta === 0) {
    writeInt32(bytes, field.dataSizeOffset, newDataSize)
    writeInt32(bytes, field.countOffset, values.length)
    for (let i = 0; i < values.length; i++) {
      writeValue(bytes, field.dataOffset + i * 4, values[i]!)
    }
    return bytes
  }
  const next = new Uint8Array(bytes.length + delta)
  next.set(bytes.subarray(0, field.dataSizeOffset))
  writeInt32(next, field.dataSizeOffset, newDataSize)
  // Layout: dataSize(4) | guid(1) | count(4) | values
  const guidOffset = field.dataSizeOffset + 4
  next[guidOffset] = 0
  const countOffset = guidOffset + 1
  writeInt32(next, countOffset, values.length)
  let cursor = countOffset + 4
  for (const v of values) {
    writeValue(next, cursor, v)
    cursor += 4
  }
  next.set(bytes.subarray(field.blockEnd), cursor)
  return next
}

/** Replace IntProperty array elements; may resize underlying buffer. */
export function writeInt32Array(bytes: Uint8Array, field: GvasInt32ArrayField, values: number[]): Uint8Array {
  return writeNumericArray(bytes, field, values, writeInt32)
}

/** Replace UInt32Property array elements; may resize underlying buffer. */
export function writeUInt32Array(bytes: Uint8Array, field: GvasInt32ArrayField, values: number[]): Uint8Array {
  return writeNumericArray(bytes, field, values, writeUInt32)
}

export function assertGvasMagic(bytes: Uint8Array): void {
  if (bytes.length < 4 || readAscii(bytes, 0, 4) !== 'GVAS') {
    throw new ModuleError('INVALID_FORMAT', ['GVAS'])
  }
}

export interface GvasUInt32ByteMapField {
  name: string
  /** Offset of payload size Int32 (numKeys + entries). */
  dataSizeOffset: number
  countOffset: number
  dataOffset: number
  count: number
  blockEnd: number
}

/**
 * MapProperty&lt;UInt32Property, ByteProperty&gt; UE 5.4 (OwnedAircrafts):
 *   name, MapProperty, Inner.Count=2, UInt32Property inner=0, ByteProperty inner=0,
 *   Size(=8+n*5), TagFlags=0, RemovedCount=0, count, {key u32, value u8}*n
 */
function parseUInt32ByteMapAt(
  bytes: Uint8Array,
  nameOffset: number,
  name: string
): GvasUInt32ByteMapField | null {
  const namePart = readNameAt(bytes, nameOffset)
  if (!namePart || namePart.name !== name) return null
  const typePart = readNameAt(bytes, namePart.next)
  if (!typePart || typePart.name !== 'MapProperty') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cursor = typePart.next
  if (cursor + 4 > bytes.length) return null
  cursor += 4
  const keyType = readNameAt(bytes, cursor)
  if (!keyType || keyType.name !== 'UInt32Property') return null
  cursor = keyType.next
  if (cursor + 4 > bytes.length) return null
  const keyInner = view.getInt32(cursor, true)
  cursor += 4
  const valType = readNameAt(bytes, cursor)
  if (!valType || valType.name !== 'ByteProperty') return null
  cursor = valType.next
  if (cursor + 4 > bytes.length) return null
  const valInner = view.getInt32(cursor, true)
  cursor += 4
  const dataSizeOffset = cursor
  const dataSize = view.getInt32(cursor, true)
  cursor += 4
  const hasGuid = bytes[cursor]
  cursor += 1
  if (keyInner !== 0 || valInner !== 0 || hasGuid !== 0) return null
  const pad = view.getInt32(cursor, true)
  cursor += 4
  if (pad !== 0) return null
  const countOffset = cursor
  const count = view.getInt32(cursor, true)
  cursor += 4
  if (count < 0 || dataSize !== 8 + count * 5) return null
  if (cursor + count * 5 > bytes.length) return null
  return {
    name,
    dataSizeOffset,
    countOffset,
    dataOffset: cursor,
    count,
    blockEnd: cursor + count * 5
  }
}

export function findUInt32ByteMapProperty(
  bytes: Uint8Array,
  name: string
): GvasUInt32ByteMapField | null {
  const needle = textEncoder.encode(`${name}\0`)
  for (let i = 4; i <= bytes.length - needle.length; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const nameLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
      i - 4,
      true
    )
    if (nameLen !== needle.length) continue
    const field = parseUInt32ByteMapAt(bytes, i - 4, name)
    if (field) return field
  }
  return null
}

export function readUInt32ByteMap(bytes: Uint8Array, field: GvasUInt32ByteMapField): Map<number, number> {
  const out = new Map<number, number>()
  for (let i = 0; i < field.count; i++) {
    const off = field.dataOffset + i * 5
    out.set(readUInt32(bytes, off), bytes[off + 4]!)
  }
  return out
}

export function writeUInt32ByteMap(
  bytes: Uint8Array,
  field: GvasUInt32ByteMapField,
  entries: Array<{ key: number; value: number }>
): Uint8Array {
  const newDataSize = 8 + entries.length * 5
  const delta = (entries.length - field.count) * 5
  const writeEntries = (buf: Uint8Array, dataSizeOffset: number) => {
    writeInt32(buf, dataSizeOffset, newDataSize)
    buf[dataSizeOffset + 4] = 0
    writeInt32(buf, dataSizeOffset + 5, 0)
    writeInt32(buf, dataSizeOffset + 9, entries.length)
    let cursor = dataSizeOffset + 13
    for (const e of entries) {
      writeUInt32(buf, cursor, e.key >>> 0)
      buf[cursor + 4] = e.value & 0xff
      cursor += 5
    }
  }
  if (delta === 0) {
    writeEntries(bytes, field.dataSizeOffset)
    return bytes
  }
  const next = new Uint8Array(bytes.length + delta)
  next.set(bytes.subarray(0, field.dataSizeOffset))
  writeEntries(next, field.dataSizeOffset)
  next.set(bytes.subarray(field.blockEnd), field.dataSizeOffset + 13 + entries.length * 5)
  return next
}

/** After TypeName.Name FString: skip Inner.Count and nested TypeNames. */
function skipTypeNameRest(bytes: Uint8Array, innerCountOffset: number): number | null {
  if (innerCountOffset + 4 > bytes.length) return null
  const n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
    innerCountOffset,
    true
  )
  if (n < 0 || n > 8) return null
  let cursor = innerCountOffset + 4
  for (let i = 0; i < n; i++) {
    const part = readNameAt(bytes, cursor)
    if (!part) return null
    const rest = skipTypeNameRest(bytes, part.next)
    if (rest == null) return null
    cursor = rest
  }
  return cursor
}

const RANK_ENUM_PREFIX = 'ELiveClearRank::'

export function findEnumProperty(bytes: Uint8Array, name: string): { valueOffset: number; value: string } | null {
  const needle = textEncoder.encode(`${name}\0`)
  for (let i = 4; i <= bytes.length - needle.length; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const nameLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
      i - 4,
      true
    )
    if (nameLen !== needle.length) continue
    const namePart = readNameAt(bytes, i - 4)
    if (!namePart) continue
    const typePart = readNameAt(bytes, namePart.next)
    if (!typePart || typePart.name !== 'EnumProperty') continue
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    let cursor = skipTypeNameRest(bytes, typePart.next)
    if (cursor == null || cursor + 5 > bytes.length) continue
    const size = view.getInt32(cursor, true)
    cursor += 4
    const tagFlags = bytes[cursor]!
    cursor += 1
    if (tagFlags !== 0) continue
    const valuePart = readNameAt(bytes, cursor)
    if (!valuePart) continue
    if (size !== 4 + (valuePart.next - cursor - 4)) continue
    return { valueOffset: cursor, value: valuePart.name.replace(/\0+$/, '') }
  }
  return null
}

/**
 * In-place FString only. GitHub's editor may grow/shrink strings because Writer.Save
 * recomputes every ancestor Size; we cannot, so length changes are refused.
 */
export function writeFStringAt(bytes: Uint8Array, offset: number, value: string): Uint8Array {
  const current = readNameAt(bytes, offset)
  if (!current) throw new ModuleError('INVALID_FORMAT', ['FString'])
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const storedLen = view.getInt32(offset, true)
  const encoded = textEncoder.encode(value)
  if (encoded.length + 1 !== storedLen) {
    throw new ModuleError('INVALID_FORMAT', ['FString.length'])
  }
  bytes.set(encoded, offset + 4)
  bytes[offset + 4 + encoded.length] = 0
  return bytes
}

export function clearRankBare(enumValue: string): string {
  return enumValue.startsWith(RANK_ENUM_PREFIX) ? enumValue.slice(RANK_ENUM_PREFIX.length) : enumValue
}

export function clearRankEnum(rank: string): string {
  return rank.startsWith(RANK_ENUM_PREFIX) ? rank : RANK_ENUM_PREFIX + rank
}
