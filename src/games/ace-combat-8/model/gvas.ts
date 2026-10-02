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
  const arrayIndex = view.getInt32(cursor, true)
  cursor += 4
  const size = view.getInt32(cursor, true)
  cursor += 4
  const hasGuid = bytes[cursor]
  cursor += 1
  if (arrayIndex !== 0 || hasGuid !== 0) return null
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

/**
 * ArrayProperty&lt;IntProperty&gt; layout (AC8 Campaign.sav):
 *   name, "ArrayProperty", arrayIndex(i32), innerType FString,
 *   pad(i32=0), dataSize(i32 = 4 + n*4), guid(u8=0), count(i32), values(i32)*n
 */
function parseInt32ArrayAt(bytes: Uint8Array, nameOffset: number, name: string): GvasInt32ArrayField | null {
  const namePart = readNameAt(bytes, nameOffset)
  if (!namePart || namePart.name !== name) return null
  const typePart = readNameAt(bytes, namePart.next)
  if (!typePart || typePart.name !== 'ArrayProperty') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cursor = typePart.next
  if (cursor + 4 > bytes.length) return null
  cursor += 4 // arrayIndex (observed as 1 in AC8)
  const inner = readNameAt(bytes, cursor)
  if (!inner || inner.name !== 'IntProperty') return null
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

/** First ArrayProperty&lt;IntProperty&gt; with matching name. */
export function findInt32ArrayProperty(bytes: Uint8Array, name: string): GvasInt32ArrayField | null {
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
    const field = parseInt32ArrayAt(bytes, i - 4, name)
    if (field) return field
  }
  return null
}

/**
 * ArrayProperty&lt;ByteProperty&gt; layout (AC8 PackedData):
 *   name, ArrayProperty, arrayIndex, ByteProperty, pad(0),
 *   dataSize(=4+count), guid(0), count, bytes[count]
 */
function parseByteArrayAt(bytes: Uint8Array, nameOffset: number, name: string): GvasByteArrayField | null {
  const namePart = readNameAt(bytes, nameOffset)
  if (!namePart || namePart.name !== name) return null
  const typePart = readNameAt(bytes, namePart.next)
  if (!typePart || typePart.name !== 'ArrayProperty') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let cursor = typePart.next
  if (cursor + 4 > bytes.length) return null
  cursor += 4 // arrayIndex
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

/** Replace array elements; may resize underlying buffer. Updates dataSize + count. */
export function writeInt32Array(bytes: Uint8Array, field: GvasInt32ArrayField, values: number[]): Uint8Array {
  const newDataSize = 4 + values.length * 4
  const delta = (values.length - field.count) * 4
  if (delta === 0) {
    writeInt32(bytes, field.dataSizeOffset, newDataSize)
    writeInt32(bytes, field.countOffset, values.length)
    for (let i = 0; i < values.length; i++) {
      writeInt32(bytes, field.dataOffset + i * 4, values[i]!)
    }
    return bytes
  }
  const next = new Uint8Array(bytes.length + delta)
  next.set(bytes.subarray(0, field.dataSizeOffset))
  writeInt32(next, field.dataSizeOffset, newDataSize)
  // pad already copied; write count after guid byte which sits between dataSize and count
  // Layout: dataSize(4) | guid(1) | count(4) | values
  const guidOffset = field.dataSizeOffset + 4
  next[guidOffset] = 0
  const countOffset = guidOffset + 1
  writeInt32(next, countOffset, values.length)
  let cursor = countOffset + 4
  for (const v of values) {
    writeInt32(next, cursor, v)
    cursor += 4
  }
  next.set(bytes.subarray(field.blockEnd), cursor)
  return next
}

export function assertGvasMagic(bytes: Uint8Array): void {
  if (bytes.length < 4 || readAscii(bytes, 0, 4) !== 'GVAS') {
    throw new ModuleError('INVALID_FORMAT', ['GVAS'])
  }
}
