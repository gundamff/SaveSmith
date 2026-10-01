/// <reference types="node" />

/**
 * hxbit (HXS) codec for Dead Cells save chunks.
 *
 * The object-data region is decoded into a value tree while partitioning the
 * original bytes into contiguous `parts`. Serializing emits each part's original
 * bytes unless a leaf was patched, so unedited data round-trips byte-identically
 * and edits only rewrite the touched leaves.
 *
 * Semantics follow HeapsIO/hxbit Serializer.hx as validated against a real
 * Dead Cells v35 `user_0.dat`, with enum-argument layouts from the community
 * shims (N3rdL0rd/alivecells, MIT).
 */

import { ENUM_SHIMS, type EnumCtor, type ShimType } from './enums'

export class HxFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HxFormatError'
  }
}

// ---------------------------------------------------------------- primitives

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export function encodeVarInt(value: number): Uint8Array {
  if (value >= 0 && value < 0x80) return new Uint8Array([value])
  const out = new Uint8Array(5)
  out[0] = 0x80
  new DataView(out.buffer).setInt32(1, value, true)
  return out
}

export function encodeInt(value: number): Uint8Array {
  return encodeVarInt(value)
}

export function encodeInt64(value: bigint): Uint8Array {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigInt64(0, value, true)
  return out
}

export function encodeFloat(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setFloat32(0, value, true)
  return out
}

export function encodeBool(value: boolean): Uint8Array {
  return new Uint8Array([value ? 1 : 0])
}

export function encodeString(value: string | null): Uint8Array {
  if (value === null) return new Uint8Array([0])
  const body = textEncoder.encode(value)
  const head = encodeVarInt(body.length + 1)
  const out = new Uint8Array(head.length + body.length)
  out.set(head, 0)
  out.set(body, head.length)
  return out
}

export function encodeBytes(value: Uint8Array | null): Uint8Array {
  if (value === null) return new Uint8Array([0])
  const head = encodeVarInt(value.length + 1)
  const out = new Uint8Array(head.length + value.length)
  out.set(head, 0)
  out.set(value, head.length)
  return out
}

// ------------------------------------------------------------------ schemas

export type PropKind =
  | 'none'
  | 'PInt' | 'PFloat' | 'PBool' | 'PString' | 'PBytes'
  | 'PSerializable' | 'PEnum' | 'PMap' | 'PArray' | 'PObj' | 'PAlias'
  | 'PVector' | 'PNull' | 'PUnknown' | 'PDynamic' | 'PInt64' | 'PFlags'
  | 'PCustom' | 'PSerInterface' | 'POldStruct' | 'PAliasCDB' | 'PNoSave'
  | 'PStruct'

const KIND_NAMES: PropKind[] = [
  'PInt', 'PFloat', 'PBool', 'PString', 'PBytes', 'PSerializable', 'PEnum',
  'PMap', 'PArray', 'PObj', 'PAlias', 'PVector', 'PNull', 'PUnknown',
  'PDynamic', 'PInt64', 'PFlags', 'PCustom', 'PSerInterface', 'POldStruct',
  'PAliasCDB', 'PNoSave', 'PStruct'
]

export interface ObjFieldDef {
  name: string | null
  opt: boolean
  type: PropType
}

export type PropType =
  | { kind: 'none' }
  | { kind: 'PInt' | 'PFloat' | 'PBool' | 'PString' | 'PBytes' | 'PUnknown' | 'PDynamic' | 'PInt64' | 'PCustom' }
  | { kind: 'PSerializable' | 'PEnum' | 'PSerInterface' | 'PStruct'; name: string }
  | { kind: 'PMap'; key: PropType; value: PropType }
  | { kind: 'PArray' | 'PAlias' | 'PVector' | 'PNull' | 'PFlags' | 'PAliasCDB' | 'PNoSave'; inner: PropType }
  | { kind: 'PObj'; fields: ObjFieldDef[] }
  | { kind: 'POldStruct'; name: string; fields: { name: string; type: PropType }[] }

export interface HxClassDef {
  name: string
  clid: number
  crc: number
}

export interface HxSchema {
  uid: number
  clid: number
  fieldNames: string[]
  fieldTypes: PropType[]
  classDef: HxClassDef | null
}

// ------------------------------------------------------------------- values

export interface HxObject {
  uid: number
  className: string
  fields: Map<string, HxValue>
}

export type HxValue =
  | { kind: 'int'; part: number; value: number }
  | { kind: 'int64'; part: number; value: bigint }
  | { kind: 'float'; part: number; value: number }
  | { kind: 'bool'; part: number; value: boolean }
  | { kind: 'string'; part: number; value: string | null }
  | { kind: 'bytes'; part: number; value: Uint8Array | null }
  | {
      kind: 'enum'
      ctorPart: number
      enumName: string
      ctor: number
      ctorName: string | null
      args: HxValue[]
    }
  | { kind: 'null'; wrapperPart: number; present: boolean; inner: HxValue | null }
  | { kind: 'array'; countPart: number; items: HxValue[] }
  | { kind: 'map'; countPart: number; entries: { key: HxValue; value: HxValue }[] }
  | {
      kind: 'obj'
      bitsPart: number
      isNull: boolean
      fields: Map<string, { present: boolean; value: HxValue | null }>
    }
  | { kind: 'ref'; uidPart: number; uid: number; obj: HxObject | null }

interface Part {
  start: number
  end: number
  patch?: Uint8Array
}

export interface HxsDoc {
  raw: Uint8Array
  headRaw: Uint8Array
  parts: Part[]
  classes: HxClassDef[]
  schemas: HxSchema[]
  root: HxObject | null
  opaque: boolean
}

// ------------------------------------------------------------------ reading

class Reader {
  pos: number
  constructor(
    readonly data: Uint8Array,
    pos = 0
  ) {
    this.pos = pos
  }
  get view(): DataView {
    return new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength)
  }
  u8(): number {
    if (this.pos >= this.data.length) throw new HxFormatError('unexpected end of stream')
    return this.data[this.pos++]!
  }
  u16be(): number {
    const v = (this.u8() << 8) | this.u8()
    return v
  }
  i32le(): number {
    const v = this.view.getInt32(this.pos, true)
    this.pos += 4
    return v
  }
  u32le(): number {
    const v = this.view.getUint32(this.pos, true)
    this.pos += 4
    return v
  }
  f32le(): number {
    const v = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return v
  }
  i64le(): bigint {
    const v = this.view.getBigInt64(this.pos, true)
    this.pos += 8
    return v
  }
  varint(): number {
    const b = this.u8()
    return b === 0x80 ? this.i32le() : b
  }
  hxsString(): string | null {
    const n = this.varint()
    if (n === 0) return null
    const len = n - 1
    if (this.pos + len > this.data.length) throw new HxFormatError('string exceeds stream')
    const s = textDecoder.decode(this.data.subarray(this.pos, this.pos + len))
    this.pos += len
    return s
  }
}

function readPropType(r: Reader): PropType {
  const b = r.u8()
  if (b === 0) return { kind: 'none' }
  const kind = KIND_NAMES[b - 1]
  if (!kind) throw new HxFormatError(`unknown PropType kind ${b - 1}`)
  switch (kind) {
    case 'PInt':
    case 'PFloat':
    case 'PBool':
    case 'PString':
    case 'PBytes':
    case 'PUnknown':
    case 'PDynamic':
    case 'PInt64':
    case 'PCustom':
      return { kind }
    case 'PSerializable':
    case 'PEnum':
    case 'PSerInterface':
    case 'PStruct': {
      const name = r.hxsString()
      if (name === null) throw new HxFormatError(`${kind} without name`)
      return { kind, name }
    }
    case 'PMap':
      return { kind, key: readPropType(r), value: readPropType(r) }
    case 'PArray':
    case 'PAlias':
    case 'PVector':
    case 'PNull':
    case 'PFlags':
    case 'PAliasCDB':
    case 'PNoSave':
      return { kind, inner: readPropType(r) }
    case 'PObj': {
      const n = r.varint()
      const fields: ObjFieldDef[] = []
      for (let i = 0; i < (n > 0 ? n - 1 : 0); i++) {
        const bits = r.varint()
        let name: string | null = null
        let opt = false
        let type: PropType = { kind: 'none' }
        if (bits > 0) {
          const v = bits - 1
          if (v & 1) name = r.hxsString()
          opt = r.u8() !== 0
          if (v & 2) type = readPropType(r)
        }
        fields.push({ name, opt, type })
      }
      return { kind, fields }
    }
    case 'POldStruct': {
      const name = r.hxsString()
      if (name === null) throw new HxFormatError('POldStruct without name')
      const n = r.varint()
      const fields: { name: string; type: PropType }[] = []
      for (let i = 0; i < n; i++) {
        const fname = r.hxsString()
        if (fname === null) throw new HxFormatError('POldStruct field without name')
        fields.push({ name: fname, type: readPropType(r) })
      }
      return { kind, name, fields }
    }
    default:
      throw new HxFormatError(`unhandled PropType kind ${String(kind)}`)
  }
}

function isNullableType(t: PropType): boolean {
  switch (t.kind) {
    case 'PInt':
    case 'PFloat':
    case 'PBool':
    case 'PFlags':
    case 'PInt64':
      return false
    case 'PAlias':
    case 'PAliasCDB':
    case 'PNoSave':
      return isNullableType(t.inner)
    default:
      return true
  }
}

function propTypeFromShim(shim: ShimType): PropType {
  switch (shim.type) {
    case 'Int':
      return { kind: 'PInt' }
    case 'Float':
      return { kind: 'PFloat' }
    case 'Bool':
      return { kind: 'PBool' }
    case 'String':
      return { kind: 'PString' }
    case 'Int64':
      return { kind: 'PInt64' }
    case 'Array':
      return { kind: 'PArray', inner: propTypeFromShim(shim.payload!) }
    case 'Vector':
      return { kind: 'PVector', inner: propTypeFromShim(shim.payload!) }
    case 'Null':
      return { kind: 'PNull', inner: propTypeFromShim(shim.payload!) }
    case 'Enum':
      return { kind: 'PEnum', name: shim.name! }
    case 'Serializable':
      return { kind: 'PSerializable', name: shim.name! }
    case 'Obj': {
      const fields: ObjFieldDef[] = Object.entries(shim.fields ?? {}).map(
        ([name, sub]) => ({ name, opt: true, type: propTypeFromShim(sub) })
      )
      return { kind: 'PObj', fields }
    }
    default:
      throw new HxFormatError(`unsupported shim type ${shim.type}`)
  }
}

function hxbitHash(name: string): number {
  let v = 1
  for (let i = 0; i < name.length; i++) v = (Math.imul(v, 223) + name.charCodeAt(i)) | 0
  v = 1 + ((v & 0x3fffffff) % 65423)
  return v
}

class ObjectWalker {
  parts: Part[] = []
  objects = new Map<number, HxObject>()
  schemaByClass = new Map<string, HxSchema>()
  schemaByClid = new Map<number, HxSchema>()

  constructor(
    readonly raw: Uint8Array,
    readonly schemas: HxSchema[],
    pos: number
  ) {
    this.pos = pos
    for (const s of schemas) {
      if (s.classDef) {
        this.schemaByClass.set(s.classDef.name, s)
        this.schemaByClid.set(hxbitHash(s.classDef.name), s)
      }
    }
  }

  pos: number

  private part(start: number): number {
    const index = this.parts.length
    this.parts.push({ start, end: this.pos })
    return index
  }

  readValue(type: PropType): HxValue {
    switch (type.kind) {
      case 'none':
        throw new HxFormatError('untyped value on the wire')
      case 'PInt':
      case 'PFlags': {
        const start = this.pos
        const value = this.readVarint()
        return { kind: 'int', part: this.part(start), value }
      }
      case 'PInt64': {
        const start = this.pos
        const value = this.readI64()
        return { kind: 'int64', part: this.part(start), value }
      }
      case 'PFloat': {
        const start = this.pos
        const value = this.readF32()
        return { kind: 'float', part: this.part(start), value }
      }
      case 'PBool': {
        const start = this.pos
        const value = this.readU8() !== 0
        return { kind: 'bool', part: this.part(start), value }
      }
      case 'PString': {
        const start = this.pos
        const value = this.readHxsString()
        return { kind: 'string', part: this.part(start), value }
      }
      case 'PBytes': {
        const start = this.pos
        const value = this.readHxsBytes()
        return { kind: 'bytes', part: this.part(start), value }
      }
      case 'PAlias':
      case 'PAliasCDB':
        return this.readValue(type.inner)
      case 'PNoSave':
        // hxbit forSave semantics: never on the wire.
        return { kind: 'bool', part: -1, value: false }
      case 'PNull': {
        const wrapperStart = this.pos
        const present = this.readU8() !== 0
        const wrapperPart = this.part(wrapperStart)
        return {
          kind: 'null',
          wrapperPart,
          present,
          inner: present ? this.readValue(type.inner) : null
        }
      }
      case 'PArray':
      case 'PVector': {
        const countStart = this.pos
        const count = this.readVarint()
        const countPart = this.part(countStart)
        const items: HxValue[] = []
        for (let i = 0; i < (count > 0 ? count - 1 : 0); i++) {
          items.push(this.readValue(type.inner))
        }
        return { kind: 'array', countPart, items }
      }
      case 'PMap': {
        const countStart = this.pos
        const count = this.readVarint()
        const countPart = this.part(countStart)
        const entries: { key: HxValue; value: HxValue }[] = []
        for (let i = 0; i < (count > 0 ? count - 1 : 0); i++) {
          entries.push({ key: this.readValue(type.key), value: this.readValue(type.value) })
        }
        return { kind: 'map', countPart, entries }
      }
      case 'PObj': {
        const bitsStart = this.pos
        const raw = this.readVarint()
        const bitsPart = this.part(bitsStart)
        const fields = new Map<string, { present: boolean; value: HxValue | null }>()
        if (raw === 0) return { kind: 'obj', bitsPart, isNull: true, fields }
        const bits = raw - 1
        let bitIdx = 0
        for (const f of type.fields) {
          let present = true
          if (isNullableType(f.type)) {
            present = (bits & (1 << bitIdx)) !== 0
            bitIdx++
          }
          const name = f.name ?? `<unnamed_${bitIdx}>`
          // Untyped PObj fields are written as plain strings (empirical rule).
          const effective: PropType = f.type.kind === 'none' ? { kind: 'PString' } : f.type
          fields.set(name, {
            present,
            value: present ? this.readValue(effective) : null
          })
        }
        return { kind: 'obj', bitsPart, isNull: false, fields }
      }
      case 'PSerializable': {
        const uidStart = this.pos
        const uid = this.readVarint()
        const uidPart = this.part(uidStart)
        if (uid === 0) return { kind: 'ref', uidPart, uid, obj: null }
        const existing = this.objects.get(uid)
        if (existing) return { kind: 'ref', uidPart, uid, obj: existing }
        const schema = this.schemaByClass.get(type.name)
        if (!schema) {
          throw new HxFormatError(`no schema for class ${type.name}`)
        }
        const obj = this.readObjectBody(uid, schema)
        return { kind: 'ref', uidPart, uid, obj }
      }
      case 'PSerInterface': {
        const uidStart = this.pos
        const uid = this.readVarint()
        const uidPart = this.part(uidStart)
        if (uid === 0) return { kind: 'ref', uidPart, uid, obj: null }
        const existing = this.objects.get(uid)
        if (existing) return { kind: 'ref', uidPart, uid, obj: existing }
        const clidStart = this.pos
        const clid = this.readU16be()
        this.part(clidStart)
        const schema = this.schemaByClid.get(clid)
        if (!schema) throw new HxFormatError(`no schema for runtime clid ${clid}`)
        const obj = this.readObjectBody(uid, schema)
        return { kind: 'ref', uidPart, uid, obj }
      }
      case 'PEnum': {
        const ctorStart = this.pos
        const ctorByte = this.readU8()
        const ctorPart = this.part(ctorStart)
        const args: HxValue[] = []
        let ctorName: string | null = null
        if (ctorByte > 0) {
          const ctor = ctorByte - 1
          const shims: EnumCtor[] | undefined = ENUM_SHIMS[type.name]
          if (shims) {
            const def = shims[ctor]
            ctorName = def?.name ?? null
            if (def) {
              for (const arg of def.args) {
                args.push(this.readValue(propTypeFromShim(arg)))
              }
            }
          } else {
            throw new HxFormatError(`unknown enum ${type.name}`)
          }
          return {
            kind: 'enum',
            ctorPart,
            enumName: type.name,
            ctor,
            ctorName,
            args
          }
        }
        return {
          kind: 'enum',
          ctorPart,
          enumName: type.name,
          ctor: -1,
          ctorName: null,
          args
        }
      }
      case 'PUnknown':
      case 'PDynamic':
      case 'PCustom':
      case 'POldStruct':
      case 'PStruct':
        throw new HxFormatError(`unsupported value kind ${type.kind}`)
      default:
        throw new HxFormatError('unreachable')
    }
  }

  readObjectBody(uid: number, schema: HxSchema): HxObject {
    const obj: HxObject = {
      uid,
      className: schema.classDef?.name ?? '?',
      fields: new Map()
    }
    this.objects.set(uid, obj)
    for (let i = 0; i < schema.fieldNames.length; i++) {
      const name = schema.fieldNames[i]!
      const type = schema.fieldTypes[i] ?? { kind: 'none' as const }
      if (type.kind === 'PNoSave') continue
      obj.fields.set(name, this.readValue(type))
    }
    return obj
  }

  /** Read a root-level object reference (uid, then body if new). */
  readRootRef(schema: HxSchema): HxObject | null {
    const uidStart = this.pos
    const uid = this.readVarint()
    this.part(uidStart)
    if (uid === 0) return null
    const existing = this.objects.get(uid)
    if (existing) return existing
    return this.readObjectBody(uid, schema)
  }

  /** Read a trailing null-terminator or padding byte as an immutable part. */
  readTrailing(): void {
    const start = this.pos
    this.readU8()
    this.part(start)
  }

  private readU8(): number {
    if (this.pos >= this.raw.length) throw new HxFormatError('unexpected end of stream')
    return this.raw[this.pos++]!
  }
  private readU16be(): number {
    return (this.readU8() << 8) | this.readU8()
  }
  private readVarint(): number {
    const b = this.readU8()
    if (b !== 0x80) return b
    const v = new DataView(this.raw.buffer, this.raw.byteOffset + this.pos, 4).getInt32(0, true)
    this.pos += 4
    return v
  }
  private readI64(): bigint {
    const v = new DataView(this.raw.buffer, this.raw.byteOffset + this.pos, 8).getBigInt64(0, true)
    this.pos += 8
    return v
  }
  private readF32(): number {
    const v = new DataView(this.raw.buffer, this.raw.byteOffset + this.pos, 4).getFloat32(0, true)
    this.pos += 4
    return v
  }
  private readHxsString(): string | null {
    const n = this.readVarint()
    if (n === 0) return null
    const len = n - 1
    const s = textDecoder.decode(this.raw.subarray(this.pos, this.pos + len))
    this.pos += len
    return s
  }
  private readHxsBytes(): Uint8Array | null {
    const n = this.readVarint()
    if (n === 0) return null
    const len = n - 1
    const v = this.raw.slice(this.pos, this.pos + len)
    this.pos += len
    return v
  }
}

// ------------------------------------------------------------------- decode

export function decodeHxs(chunk: Uint8Array, rootClassName: string): HxsDoc {
  const r = new Reader(chunk)
  const magic = r.hxsString()
  if (magic !== 'HXS') throw new HxFormatError('not HXS data')
  const version = r.u8()
  if (version !== 1) throw new HxFormatError(`unsupported HXS version ${version}`)
  const classes: HxClassDef[] = []
  for (;;) {
    const name = r.hxsString()
    if (name === null) break
    const clid = r.u16be()
    const crc = r.u32le()
    classes.push({ name, clid, crc })
  }
  const schemaSize = r.varint()
  const schemaStart = r.pos
  const schemaEnd = schemaStart + schemaSize
  const schemas: HxSchema[] = []
  while (r.pos < schemaEnd) {
    const uid = r.varint()
    const clid = r.varint()
    const nNames = r.varint()
    const fieldNames: string[] = []
    for (let i = 0; i < (nNames > 0 ? nNames - 1 : 0); i++) {
      const name = r.hxsString()
      if (name === null) throw new HxFormatError('null field name')
      fieldNames.push(name)
    }
    const nTypes = r.varint()
    const fieldTypes: PropType[] = []
    for (let i = 0; i < (nTypes > 0 ? nTypes - 1 : 0); i++) {
      fieldTypes.push(readPropType(r))
    }
    schemas.push({ uid, clid, fieldNames, fieldTypes, classDef: null })
  }
  if (r.pos !== schemaEnd) throw new HxFormatError('schema section over/underflow')
  if (classes.length === schemas.length) {
    for (let i = 0; i < classes.length; i++) schemas[i]!.classDef = classes[i]!
  }
  const headRaw = chunk.slice(0, schemaEnd)

  const walk = new ObjectWalker(chunk, schemas, schemaEnd)
  let root: HxObject | null = null
  let opaque = false
  try {
    const rootSchema = walk.schemaByClass.get(rootClassName)
    if (!rootSchema) throw new HxFormatError(`no schema for root class ${rootClassName}`)
    while (walk.pos < chunk.length) {
      const obj = walk.readRootRef(rootSchema)
      if (obj && root === null) root = obj
    }
    if (walk.parts.length === 0) throw new HxFormatError('no object data')
  } catch {
    opaque = true
    walk.parts = [{ start: schemaEnd, end: chunk.length }]
    root = null
    walk.objects.clear()
  }
  // Guarantee parts cover the object region contiguously.
  const last = walk.parts[walk.parts.length - 1]!
  if (last.end < chunk.length) walk.parts.push({ start: last.end, end: chunk.length })
  return { raw: chunk, headRaw, parts: walk.parts, classes, schemas, root, opaque }
}

// ------------------------------------------------------------------- encode

export function encodeHxs(doc: HxsDoc): Uint8Array {
  const chunks: Uint8Array[] = [doc.headRaw]
  let total = doc.headRaw.length
  for (const part of doc.parts) {
    const bytes = part.patch ?? doc.raw.subarray(part.start, part.end)
    chunks.push(bytes)
    total += bytes.length
  }
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

export function patchPart(doc: HxsDoc, part: number, bytes: Uint8Array): void {
  const target = doc.parts[part]
  if (!target) throw new HxFormatError(`no part ${part}`)
  target.patch = bytes
}

// ------------------------------------------------------------- leaf helpers

export function setIntValue(doc: HxsDoc, node: Extract<HxValue, { kind: 'int' }>, value: number): void {
  node.value = value
  patchPart(doc, node.part, encodeInt(value))
}

export function setInt64Value(
  doc: HxsDoc,
  node: Extract<HxValue, { kind: 'int64' }>,
  value: bigint
): void {
  node.value = value
  patchPart(doc, node.part, encodeInt64(value))
}

export function setFloatValue(
  doc: HxsDoc,
  node: Extract<HxValue, { kind: 'float' }>,
  value: number
): void {
  node.value = value
  patchPart(doc, node.part, encodeFloat(value))
}

export function setBoolValue(
  doc: HxsDoc,
  node: Extract<HxValue, { kind: 'bool' }>,
  value: boolean
): void {
  node.value = value
  patchPart(doc, node.part, encodeBool(value))
}

export function setStringValue(
  doc: HxsDoc,
  node: Extract<HxValue, { kind: 'string' }>,
  value: string | null
): void {
  node.value = value
  patchPart(doc, node.part, encodeString(value))
}

// -------------------------------------------------------------- value views

export function asInt(v: HxValue | undefined): number | null {
  return v && v.kind === 'int' ? v.value : null
}

export function asBool(v: HxValue | undefined): boolean | null {
  return v && v.kind === 'bool' ? v.value : null
}

export function asString(v: HxValue | undefined): string | null {
  return v && v.kind === 'string' ? v.value : null
}

export function asObject(v: HxValue | undefined): HxObject | null {
  return v && v.kind === 'ref' ? v.obj : null
}

export function asArray(v: HxValue | undefined): HxValue[] | null {
  return v && v.kind === 'array' ? v.items : null
}
