export type Es3TypeHash = 'int' | 'bool' | 'string' | 'float' | 'int[]' | 'bool[]' | 'raw'

export interface Es3BinaryEntry {
  key: string
  settings: number
  /** Decoded when kind !== 'raw' */
  kind: Es3TypeHash
  value?: number | boolean | string | number[] | boolean[]
  /** Present when kind === 'raw': payload after settings (includes optional 0x51… through pre-0x7B) */
  rawPayload?: Uint8Array
}

const HASH_INT = new Uint8Array([0x56, 0x08, 0xa8, 0xe2])
const HASH_BOOL = new Uint8Array([0x9c, 0x7c, 0x4d, 0xad])
const HASH_STRING = new Uint8Array([0xee, 0xf1, 0xe9, 0xfd])
const HASH_FLOAT = new Uint8Array([0x6b, 0xd7, 0x3e, 0x6e])

const ENTRY_START = 0x7e
const ENTRY_END = 0x7b
const ARRAY_MARKER = 0x51
const RAW_MARKER = 0x53
const TYPE_MARKER = 0xff

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function hashEquals(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index])
}

function readInt32LE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4)
  return view.getInt32(0, true)
}

function writeInt32LE(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setInt32(0, value, true)
  return out
}

function readFloat32LE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4)
  return view.getFloat32(0, true)
}

function writeFloat32LE(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setFloat32(0, value, true)
  return out
}

function findEntryEnd(bytes: Uint8Array, start: number): number {
  for (let i = start; i < bytes.length; i++) {
    if (bytes[i] !== ENTRY_END) continue
    // Data bytes may be 0x7B (e.g. int 123). Real terminator is 0x7B then 0x7E or EOF.
    if (i + 1 === bytes.length || bytes[i + 1] === ENTRY_START) {
      return i
    }
  }
  throw new Error('Missing entry terminator 0x7B')
}

function sliceRawPayload(bytes: Uint8Array, payloadStart: number): { rawPayload: Uint8Array; nextOffset: number } {
  const end = findEntryEnd(bytes, payloadStart)
  return {
    rawPayload: bytes.slice(payloadStart, end),
    nextOffset: end + 1
  }
}

function parseKnownPayload(
  bytes: Uint8Array,
  offset: number,
  hash: Uint8Array,
  arrayMode: boolean
): { kind: Es3TypeHash; value: Es3BinaryEntry['value']; nextOffset: number } {
  if (arrayMode) {
    const count = readInt32LE(bytes, offset)
    offset += 4
    if (hashEquals(hash, HASH_INT)) {
      const values: number[] = []
      for (let i = 0; i < count; i++) {
        values.push(readInt32LE(bytes, offset))
        offset += 4
      }
      return { kind: 'int[]', value: values, nextOffset: offset }
    }
    if (hashEquals(hash, HASH_BOOL)) {
      const values: boolean[] = []
      for (let i = 0; i < count; i++) {
        values.push(bytes[offset] !== 0)
        offset += 1
      }
      return { kind: 'bool[]', value: values, nextOffset: offset }
    }
    throw new Error('Unsupported array hash')
  }

  if (hashEquals(hash, HASH_INT)) {
    return { kind: 'int', value: readInt32LE(bytes, offset), nextOffset: offset + 4 }
  }
  if (hashEquals(hash, HASH_BOOL)) {
    return { kind: 'bool', value: bytes[offset] !== 0, nextOffset: offset + 1 }
  }
  if (hashEquals(hash, HASH_STRING)) {
    const len = bytes[offset]
    offset += 1
    const value = textDecoder.decode(bytes.slice(offset, offset + len))
    return { kind: 'string', value, nextOffset: offset + len }
  }
  if (hashEquals(hash, HASH_FLOAT)) {
    return { kind: 'float', value: readFloat32LE(bytes, offset), nextOffset: offset + 4 }
  }
  throw new Error('Unsupported scalar hash')
}

function isKnownHash(hash: Uint8Array, arrayMode: boolean): boolean {
  if (arrayMode) {
    return hashEquals(hash, HASH_INT) || hashEquals(hash, HASH_BOOL)
  }
  return (
    hashEquals(hash, HASH_INT) ||
    hashEquals(hash, HASH_BOOL) ||
    hashEquals(hash, HASH_STRING) ||
    hashEquals(hash, HASH_FLOAT)
  )
}

export function parseEs3Binary(bytes: Uint8Array): Es3BinaryEntry[] {
  const entries: Es3BinaryEntry[] = []
  let offset = 0

  while (offset < bytes.length) {
    if (bytes[offset] !== ENTRY_START) {
      throw new Error(`Expected entry start 0x7E at offset ${offset}`)
    }
    offset += 1

    const keyLen = bytes[offset]
    offset += 1
    const key = textDecoder.decode(bytes.slice(offset, offset + keyLen))
    offset += keyLen

    const settings = readInt32LE(bytes, offset)
    offset += 4
    const payloadStart = offset

    if (bytes[offset] === RAW_MARKER) {
      const { rawPayload, nextOffset } = sliceRawPayload(bytes, payloadStart)
      entries.push({ key, settings, kind: 'raw', rawPayload })
      offset = nextOffset
      continue
    }

    let arrayMode = false
    if (bytes[offset] === ARRAY_MARKER) {
      arrayMode = true
      offset += 1
    }

    if (bytes[offset] !== TYPE_MARKER) {
      const { rawPayload, nextOffset } = sliceRawPayload(bytes, payloadStart)
      entries.push({ key, settings, kind: 'raw', rawPayload })
      offset = nextOffset
      continue
    }
    offset += 1

    const hash = bytes.slice(offset, offset + 4)
    offset += 4

    if (!isKnownHash(hash, arrayMode)) {
      const { rawPayload, nextOffset } = sliceRawPayload(bytes, payloadStart)
      entries.push({ key, settings, kind: 'raw', rawPayload })
      offset = nextOffset
      continue
    }

    try {
      const parsed = parseKnownPayload(bytes, offset, hash, arrayMode)
      if (bytes[parsed.nextOffset] === ENTRY_END) {
        offset = parsed.nextOffset + 1
        entries.push({
          key,
          settings,
          kind: parsed.kind,
          value: parsed.value
        })
        continue
      }
    } catch {
      // Fall through to opaque raw (same as unknown hash).
    }

    const raw = sliceRawPayload(bytes, payloadStart)
    entries.push({ key, settings, kind: 'raw', rawPayload: raw.rawPayload })
    offset = raw.nextOffset
  }

  return entries
}

function concatParts(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function serializePayload(entry: Es3BinaryEntry): Uint8Array {
  if (entry.kind === 'raw') {
    if (!entry.rawPayload) {
      throw new Error(`Raw entry "${entry.key}" missing rawPayload`)
    }
    return entry.rawPayload
  }

  const parts: Uint8Array[] = []
  const arrayMode = entry.kind.endsWith('[]')

  if (arrayMode) {
    parts.push(new Uint8Array([ARRAY_MARKER]))
  }

  parts.push(new Uint8Array([TYPE_MARKER]))

  switch (entry.kind) {
    case 'int': {
      parts.push(HASH_INT, writeInt32LE(entry.value as number))
      break
    }
    case 'bool': {
      parts.push(HASH_BOOL, new Uint8Array([(entry.value as boolean) ? 1 : 0]))
      break
    }
    case 'string': {
      const encoded = textEncoder.encode(entry.value as string)
      parts.push(HASH_STRING, new Uint8Array([encoded.length]), encoded)
      break
    }
    case 'float': {
      parts.push(HASH_FLOAT, writeFloat32LE(entry.value as number))
      break
    }
    case 'int[]': {
      const values = entry.value as number[]
      parts.push(HASH_INT, writeInt32LE(values.length))
      for (const value of values) {
        parts.push(writeInt32LE(value))
      }
      break
    }
    case 'bool[]': {
      const values = entry.value as boolean[]
      parts.push(HASH_BOOL, writeInt32LE(values.length))
      for (const value of values) {
        parts.push(new Uint8Array([value ? 1 : 0]))
      }
      break
    }
    default:
      throw new Error(`Unsupported entry kind "${entry.kind}"`)
  }

  return concatParts(parts)
}

export function serializeEs3Binary(entries: Es3BinaryEntry[]): Uint8Array {
  const parts: Uint8Array[] = []

  for (const entry of entries) {
    const keyBytes = textEncoder.encode(entry.key)
    if (keyBytes.length > 255) {
      throw new Error(`Key "${entry.key}" exceeds 255 bytes`)
    }

    parts.push(new Uint8Array([ENTRY_START, keyBytes.length]))
    parts.push(keyBytes)
    parts.push(writeInt32LE(entry.settings))
    parts.push(serializePayload(entry))
    parts.push(new Uint8Array([ENTRY_END]))
  }

  return concatParts(parts)
}

export function getEntry(entries: Es3BinaryEntry[], key: string): Es3BinaryEntry | undefined {
  return entries.find((entry) => entry.key === key)
}

export function setScalar(entries: Es3BinaryEntry[], key: string, value: number | boolean | string): void {
  const entry = getEntry(entries, key)
  if (!entry) {
    throw new Error(`Missing entry "${key}"`)
  }
  if (entry.kind === 'raw') {
    throw new Error(`Cannot set scalar on raw entry "${key}"`)
  }

  entry.value = value
  if (typeof value === 'number') {
    entry.kind = Number.isInteger(value) ? 'int' : 'float'
  } else if (typeof value === 'boolean') {
    entry.kind = 'bool'
  } else {
    entry.kind = 'string'
  }
}

export function setArray(entries: Es3BinaryEntry[], key: string, value: number[] | boolean[]): void {
  const entry = getEntry(entries, key)
  if (!entry) {
    throw new Error(`Missing entry "${key}"`)
  }
  if (entry.kind === 'raw') {
    throw new Error(`Cannot set array on raw entry "${key}"`)
  }

  entry.value = value
  if (value.length === 0) {
    if (entry.kind === 'int[]' || entry.kind === 'bool[]') {
      return
    }
    entry.kind = 'int[]'
    return
  }
  entry.kind = typeof value[0] === 'boolean' ? 'bool[]' : 'int[]'
}
