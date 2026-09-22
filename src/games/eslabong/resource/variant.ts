/** Godot 4.x binary resource Variant type tags (resource_format_binary.cpp). */

export const VARIANT_NIL = 1
export const VARIANT_BOOL = 2
export const VARIANT_INT = 3
export const VARIANT_FLOAT = 4
export const VARIANT_STRING = 5
export const VARIANT_VECTOR2 = 10
export const VARIANT_RECT2 = 11
export const VARIANT_VECTOR3 = 12
export const VARIANT_PLANE = 13
export const VARIANT_QUATERNION = 14
export const VARIANT_AABB = 15
export const VARIANT_BASIS = 16
export const VARIANT_TRANSFORM3D = 17
export const VARIANT_TRANSFORM2D = 18
export const VARIANT_COLOR = 20
export const VARIANT_NODE_PATH = 22
export const VARIANT_RID = 23
export const VARIANT_OBJECT = 24
export const VARIANT_INPUT_EVENT = 25
export const VARIANT_DICTIONARY = 26
export const VARIANT_ARRAY = 30
export const VARIANT_PACKED_BYTE_ARRAY = 31
export const VARIANT_PACKED_INT32_ARRAY = 32
export const VARIANT_PACKED_FLOAT32_ARRAY = 33
export const VARIANT_PACKED_STRING_ARRAY = 34
export const VARIANT_PACKED_VECTOR3_ARRAY = 35
export const VARIANT_PACKED_COLOR_ARRAY = 36
export const VARIANT_PACKED_VECTOR2_ARRAY = 37
export const VARIANT_INT64 = 40
export const VARIANT_DOUBLE = 41
export const VARIANT_CALLABLE = 42
export const VARIANT_SIGNAL = 43
export const VARIANT_STRING_NAME = 44
export const VARIANT_VECTOR2I = 45
export const VARIANT_RECT2I = 46
export const VARIANT_VECTOR3I = 47
export const VARIANT_PACKED_INT64_ARRAY = 48
export const VARIANT_PACKED_FLOAT64_ARRAY = 49
export const VARIANT_VECTOR4 = 50
export const VARIANT_VECTOR4I = 51
export const VARIANT_PROJECTION = 52
export const VARIANT_PACKED_VECTOR4_ARRAY = 53

export const OBJECT_EMPTY = 0
export const OBJECT_EXTERNAL_RESOURCE = 1
export const OBJECT_INTERNAL_RESOURCE = 2
export const OBJECT_EXTERNAL_RESOURCE_INDEX = 3

export const FORMAT_FLAG_NAMED_SCENE_IDS = 1
export const FORMAT_FLAG_UIDS = 2
export const FORMAT_FLAG_REAL_T_IS_DOUBLE = 4
export const FORMAT_FLAG_HAS_SCRIPT_CLASS = 8
export const RESERVED_FIELDS = 11

export type ResValue =
  | null
  | boolean
  | number
  | string
  | ResValue[]
  | { [k: string]: ResValue }
  | { __raw: Uint8Array; __hint?: string }

export function isRawValue(v: ResValue): v is { __raw: Uint8Array; __hint?: string } {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && '__raw' in v
}

/** Structural variant node for faithful rewrite. */
export type VariantNode =
  | { kind: 'nil' }
  | { kind: 'bool'; value: boolean }
  | { kind: 'int'; value: number }
  | { kind: 'int64'; value: bigint }
  | { kind: 'float'; value: number }
  | { kind: 'double'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'string_name'; value: string }
  | { kind: 'dict'; entries: Array<{ key: VariantNode; value: VariantNode }> }
  | { kind: 'array'; items: VariantNode[] }
  | {
      kind: 'object'
      objType: number
      /** internal / external-index */
      index?: number
      /** legacy external */
      extType?: string
      extPath?: string
    }
  | { kind: 'raw'; bytes: Uint8Array; hint: string }

export type BinReader = {
  view: DataView
  bytes: Uint8Array
  pos: number
  realIsDouble: boolean
  stringTable: string[]
}

export type BinWriter = {
  chunks: number[]
  realIsDouble: boolean
  stringTable: string[]
}

export function readU32(r: BinReader): number {
  const v = r.view.getUint32(r.pos, true)
  r.pos += 4
  return v
}

export function readI32(r: BinReader): number {
  const v = r.view.getInt32(r.pos, true)
  r.pos += 4
  return v
}

export function readU16(r: BinReader): number {
  const v = r.view.getUint16(r.pos, true)
  r.pos += 2
  return v
}

export function readU64(r: BinReader): bigint {
  const v = r.view.getBigUint64(r.pos, true)
  r.pos += 8
  return v
}

export function readI64(r: BinReader): bigint {
  const v = r.view.getBigInt64(r.pos, true)
  r.pos += 8
  return v
}

export function readF32(r: BinReader): number {
  const v = r.view.getFloat32(r.pos, true)
  r.pos += 4
  return v
}

export function readF64(r: BinReader): number {
  const v = r.view.getFloat64(r.pos, true)
  r.pos += 8
  return v
}

export function readReal(r: BinReader): number {
  return r.realIsDouble ? readF64(r) : readF32(r)
}

export function readBytes(r: BinReader, n: number): Uint8Array {
  const slice = r.bytes.subarray(r.pos, r.pos + n)
  r.pos += n
  return slice
}

export function readUnicode(r: BinReader): string {
  const len = readU32(r)
  if (len === 0) return ''
  const raw = readBytes(r, len)
  let end = raw.length
  if (end > 0 && raw[end - 1] === 0) end--
  return new TextDecoder('utf-8').decode(raw.subarray(0, end))
}

/** Property / NodePath name: high bit ⇒ inline unicode, else string-table index. */
export function readName(r: BinReader): { name: string; nameIndex: number | null; inline: boolean } {
  const id = readU32(r)
  if (id & 0x80000000) {
    const len = id & 0x7fffffff
    if (len === 0) return { name: '', nameIndex: null, inline: true }
    const raw = readBytes(r, len)
    let end = raw.length
    if (end > 0 && raw[end - 1] === 0) end--
    return {
      name: new TextDecoder('utf-8').decode(raw.subarray(0, end)),
      nameIndex: null,
      inline: true
    }
  }
  const name = r.stringTable[id] ?? ''
  return { name, nameIndex: id, inline: false }
}

function advancePadding(r: BinReader, len: number): void {
  const extra = 4 - (len % 4)
  if (extra < 4) r.pos += extra
}

function realSize(r: BinReader): number {
  return r.realIsDouble ? 8 : 4
}

/** Parse one variant; unrecognized types become raw (including type tag). */
export function parseVariant(r: BinReader): VariantNode {
  const start = r.pos
  const type = readU32(r)
  try {
    switch (type) {
      case VARIANT_NIL:
        return { kind: 'nil' }
      case VARIANT_BOOL:
        return { kind: 'bool', value: readU32(r) !== 0 }
      case VARIANT_INT:
        return { kind: 'int', value: readI32(r) }
      case VARIANT_INT64:
        return { kind: 'int64', value: readI64(r) }
      case VARIANT_FLOAT:
        return { kind: 'float', value: readReal(r) }
      case VARIANT_DOUBLE:
        return { kind: 'double', value: readF64(r) }
      case VARIANT_STRING:
        return { kind: 'string', value: readUnicode(r) }
      case VARIANT_STRING_NAME:
        return { kind: 'string_name', value: readUnicode(r) }
      case VARIANT_DICTIONARY: {
        let len = readU32(r)
        len &= 0x7fffffff
        const entries: Array<{ key: VariantNode; value: VariantNode }> = []
        for (let i = 0; i < len; i++) {
          entries.push({ key: parseVariant(r), value: parseVariant(r) })
        }
        return { kind: 'dict', entries }
      }
      case VARIANT_ARRAY: {
        let len = readU32(r)
        len &= 0x7fffffff
        const items: VariantNode[] = []
        for (let i = 0; i < len; i++) items.push(parseVariant(r))
        return { kind: 'array', items }
      }
      case VARIANT_OBJECT: {
        const objType = readU32(r)
        if (objType === OBJECT_EMPTY) return { kind: 'object', objType }
        if (objType === OBJECT_INTERNAL_RESOURCE || objType === OBJECT_EXTERNAL_RESOURCE_INDEX) {
          return { kind: 'object', objType, index: readU32(r) }
        }
        if (objType === OBJECT_EXTERNAL_RESOURCE) {
          return {
            kind: 'object',
            objType,
            extType: readUnicode(r),
            extPath: readUnicode(r)
          }
        }
        throw new Error(`object subtype ${objType}`)
      }
      case VARIANT_CALLABLE:
      case VARIANT_SIGNAL:
        return { kind: 'raw', bytes: r.bytes.slice(start, r.pos), hint: `variant_${type}` }
      case VARIANT_RID:
        r.pos += 4
        return rawFrom(r, start, 'rid')
      case VARIANT_VECTOR2:
        r.pos += realSize(r) * 2
        return rawFrom(r, start, 'vector2')
      case VARIANT_VECTOR2I:
        r.pos += 8
        return rawFrom(r, start, 'vector2i')
      case VARIANT_VECTOR3:
        r.pos += realSize(r) * 3
        return rawFrom(r, start, 'vector3')
      case VARIANT_VECTOR3I:
        r.pos += 12
        return rawFrom(r, start, 'vector3i')
      case VARIANT_VECTOR4:
        r.pos += realSize(r) * 4
        return rawFrom(r, start, 'vector4')
      case VARIANT_VECTOR4I:
        r.pos += 16
        return rawFrom(r, start, 'vector4i')
      case VARIANT_RECT2:
        r.pos += realSize(r) * 4
        return rawFrom(r, start, 'rect2')
      case VARIANT_RECT2I:
        r.pos += 16
        return rawFrom(r, start, 'rect2i')
      case VARIANT_PLANE:
        r.pos += realSize(r) * 4
        return rawFrom(r, start, 'plane')
      case VARIANT_QUATERNION:
        r.pos += realSize(r) * 4
        return rawFrom(r, start, 'quaternion')
      case VARIANT_AABB:
        r.pos += realSize(r) * 6
        return rawFrom(r, start, 'aabb')
      case VARIANT_TRANSFORM2D:
        r.pos += realSize(r) * 6
        return rawFrom(r, start, 'transform2d')
      case VARIANT_BASIS:
        r.pos += realSize(r) * 9
        return rawFrom(r, start, 'basis')
      case VARIANT_TRANSFORM3D:
        r.pos += realSize(r) * 12
        return rawFrom(r, start, 'transform3d')
      case VARIANT_PROJECTION:
        r.pos += realSize(r) * 16
        return rawFrom(r, start, 'projection')
      case VARIANT_COLOR:
        r.pos += 16
        return rawFrom(r, start, 'color')
      case VARIANT_NODE_PATH: {
        const nameCount = readU16(r)
        let subCount = readU16(r)
        subCount &= 0x7fff
        for (let i = 0; i < nameCount + subCount; i++) readName(r)
        return rawFrom(r, start, 'node_path')
      }
      case VARIANT_PACKED_BYTE_ARRAY: {
        const len = readU32(r)
        r.pos += len
        advancePadding(r, len)
        return rawFrom(r, start, 'packed_byte_array')
      }
      case VARIANT_PACKED_INT32_ARRAY: {
        const len = readU32(r)
        r.pos += len * 4
        return rawFrom(r, start, 'packed_int32_array')
      }
      case VARIANT_PACKED_INT64_ARRAY: {
        const len = readU32(r)
        r.pos += len * 8
        return rawFrom(r, start, 'packed_int64_array')
      }
      case VARIANT_PACKED_FLOAT32_ARRAY: {
        const len = readU32(r)
        r.pos += len * 4
        return rawFrom(r, start, 'packed_float32_array')
      }
      case VARIANT_PACKED_FLOAT64_ARRAY: {
        const len = readU32(r)
        r.pos += len * 8
        return rawFrom(r, start, 'packed_float64_array')
      }
      case VARIANT_PACKED_STRING_ARRAY: {
        const len = readU32(r)
        for (let i = 0; i < len; i++) readUnicode(r)
        return rawFrom(r, start, 'packed_string_array')
      }
      case VARIANT_PACKED_VECTOR2_ARRAY: {
        const len = readU32(r)
        r.pos += len * realSize(r) * 2
        return rawFrom(r, start, 'packed_vector2_array')
      }
      case VARIANT_PACKED_VECTOR3_ARRAY: {
        const len = readU32(r)
        r.pos += len * realSize(r) * 3
        return rawFrom(r, start, 'packed_vector3_array')
      }
      case VARIANT_PACKED_VECTOR4_ARRAY: {
        const len = readU32(r)
        r.pos += len * realSize(r) * 4
        return rawFrom(r, start, 'packed_vector4_array')
      }
      case VARIANT_PACKED_COLOR_ARRAY: {
        const len = readU32(r)
        r.pos += len * 16
        return rawFrom(r, start, 'packed_color_array')
      }
      case VARIANT_INPUT_EVENT:
      default: {
        throw new Error(`unsupported variant type ${type}`)
      }
    }
  } catch (e) {
    // Should not leave reader mid-variant; callers must not hit this for known saves.
    throw e instanceof Error
      ? new Error(`parseVariant@${start}: ${e.message}`)
      : e
  }
}

function rawFrom(r: BinReader, start: number, hint: string): VariantNode {
  return { kind: 'raw', bytes: r.bytes.slice(start, r.pos), hint }
}

export function writeU32(w: BinWriter, v: number): void {
  w.chunks.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff)
}

export function writeU64(w: BinWriter, v: bigint): void {
  writeU32(w, Number(v & 0xffffffffn))
  writeU32(w, Number((v >> 32n) & 0xffffffffn))
}

export function writeI32(w: BinWriter, v: number): void {
  writeU32(w, v | 0)
}

export function writeI64(w: BinWriter, v: bigint): void {
  writeU64(w, BigInt.asUintN(64, v))
}

export function writeF32(w: BinWriter, v: number): void {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setFloat32(0, v, true)
  w.chunks.push(...new Uint8Array(buf))
}

export function writeF64(w: BinWriter, v: number): void {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setFloat64(0, v, true)
  w.chunks.push(...new Uint8Array(buf))
}

export function writeReal(w: BinWriter, v: number): void {
  if (w.realIsDouble) writeF64(w, v)
  else writeF32(w, v)
}

export function writeUnicode(w: BinWriter, s: string): void {
  const utf8 = new TextEncoder().encode(s)
  writeU32(w, utf8.length + 1)
  w.chunks.push(...utf8, 0)
}

export function writeBytes(w: BinWriter, bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) w.chunks.push(bytes[i]!)
}

export function writeName(w: BinWriter, nameIndex: number | null, name: string): void {
  if (nameIndex !== null) {
    writeU32(w, nameIndex >>> 0)
    return
  }
  const utf8 = new TextEncoder().encode(name)
  writeU32(w, (utf8.length + 1) | 0x80000000)
  w.chunks.push(...utf8, 0)
}

export function writeVariant(w: BinWriter, node: VariantNode): void {
  switch (node.kind) {
    case 'nil':
      writeU32(w, VARIANT_NIL)
      return
    case 'bool':
      writeU32(w, VARIANT_BOOL)
      writeU32(w, node.value ? 1 : 0)
      return
    case 'int':
      writeU32(w, VARIANT_INT)
      writeI32(w, node.value)
      return
    case 'int64':
      writeU32(w, VARIANT_INT64)
      writeI64(w, node.value)
      return
    case 'float':
      writeU32(w, VARIANT_FLOAT)
      writeReal(w, node.value)
      return
    case 'double':
      writeU32(w, VARIANT_DOUBLE)
      writeF64(w, node.value)
      return
    case 'string':
      writeU32(w, VARIANT_STRING)
      writeUnicode(w, node.value)
      return
    case 'string_name':
      writeU32(w, VARIANT_STRING_NAME)
      writeUnicode(w, node.value)
      return
    case 'dict':
      writeU32(w, VARIANT_DICTIONARY)
      writeU32(w, node.entries.length)
      for (const e of node.entries) {
        writeVariant(w, e.key)
        writeVariant(w, e.value)
      }
      return
    case 'array':
      writeU32(w, VARIANT_ARRAY)
      writeU32(w, node.items.length)
      for (const item of node.items) writeVariant(w, item)
      return
    case 'object':
      writeU32(w, VARIANT_OBJECT)
      writeU32(w, node.objType)
      if (node.objType === OBJECT_EMPTY) return
      if (node.objType === OBJECT_INTERNAL_RESOURCE || node.objType === OBJECT_EXTERNAL_RESOURCE_INDEX) {
        writeU32(w, node.index ?? 0)
        return
      }
      if (node.objType === OBJECT_EXTERNAL_RESOURCE) {
        writeUnicode(w, node.extType ?? '')
        writeUnicode(w, node.extPath ?? '')
        return
      }
      throw new Error(`cannot write object subtype ${node.objType}`)
    case 'raw':
      writeBytes(w, node.bytes)
      return
  }
}

export function variantToResValue(node: VariantNode): ResValue {
  switch (node.kind) {
    case 'nil':
      return null
    case 'bool':
      return node.value
    case 'int':
    case 'float':
    case 'double':
      return node.value
    case 'int64': {
      const n = Number(node.value)
      if (Number.isSafeInteger(n)) return n
      return { __raw: encodeTemp(node), __hint: 'int64_unsafe' }
    }
    case 'string':
    case 'string_name':
      return node.value
    case 'array':
      return node.items.map(variantToResValue)
    case 'dict': {
      const out: Record<string, ResValue> = {}
      let allStringKeys = true
      for (const e of node.entries) {
        if (e.key.kind !== 'string' && e.key.kind !== 'string_name') {
          allStringKeys = false
          break
        }
        out[e.key.value] = variantToResValue(e.value)
      }
      if (allStringKeys) return out
      return { __raw: encodeTemp(node), __hint: 'dict_nonstring_keys' }
    }
    case 'object':
      return { __raw: encodeTemp(node), __hint: `object_${node.objType}` }
    case 'raw':
      return { __raw: node.bytes, __hint: node.hint }
  }
}

function encodeTemp(node: VariantNode): Uint8Array {
  const w: BinWriter = { chunks: [], realIsDouble: false, stringTable: [] }
  writeVariant(w, node)
  return new Uint8Array(w.chunks)
}

/** Convert ResValue → VariantNode, preferring prior wire kind when updating scalars. */
export function resValueToVariant(value: ResValue, prefer?: VariantNode): VariantNode {
  if (isRawValue(value)) {
    return { kind: 'raw', bytes: value.__raw, hint: value.__hint ?? 'raw' }
  }
  if (value === null) return { kind: 'nil' }
  if (typeof value === 'boolean') return { kind: 'bool', value }
  if (typeof value === 'string') {
    if (prefer?.kind === 'string_name') return { kind: 'string_name', value }
    return { kind: 'string', value }
  }
  if (typeof value === 'number') {
    if (prefer?.kind === 'float') return { kind: 'float', value }
    if (prefer?.kind === 'double') return { kind: 'double', value }
    if (prefer?.kind === 'int64') return { kind: 'int64', value: BigInt(Math.trunc(value)) }
    if (prefer?.kind === 'int' || Number.isInteger(value)) {
      if (value >= -0x80000000 && value <= 0x7fffffff) return { kind: 'int', value: value | 0 }
      return { kind: 'int64', value: BigInt(Math.trunc(value)) }
    }
    return { kind: 'double', value }
  }
  if (Array.isArray(value)) {
    const preferItems = prefer?.kind === 'array' ? prefer.items : undefined
    return {
      kind: 'array',
      items: value.map((v, i) => resValueToVariant(v, preferItems?.[i]))
    }
  }
  // plain object → dictionary
  const preferEntries = prefer?.kind === 'dict' ? prefer.entries : undefined
  const entries: Array<{ key: VariantNode; value: VariantNode }> = []
  for (const [k, v] of Object.entries(value)) {
    const prev = preferEntries?.find(
      (e) => (e.key.kind === 'string' || e.key.kind === 'string_name') && e.key.value === k
    )
    entries.push({
      key: prev?.key.kind === 'string_name' ? { kind: 'string_name', value: k } : { kind: 'string', value: k },
      value: resValueToVariant(v, prev?.value)
    })
  }
  return { kind: 'dict', entries }
}
