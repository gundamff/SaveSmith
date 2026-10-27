/**
 * UE5.5+ GVAS path index for FINAL FANTASY RESONANCE (Clean-room).
 * Scans property tags into path → offset maps for in-place scalar edits and appends.
 */
import { ModuleError } from '@sdk/error'

export type TypeName = { name: string; inner: TypeName[] }

export type FieldKind =
  | 'IntProperty'
  | 'UInt32Property'
  | 'Int64Property'
  | 'FloatProperty'
  | 'DoubleProperty'
  | 'Int16Property'
  | 'ByteValue'

export interface FieldRef {
  off: number
  kind: FieldKind
}

export interface BoolRef {
  off: number
  tagged: boolean
}

export interface ArrayRef {
  countOff: number
  end: number
  inner: TypeName
}

export interface MapRef {
  countOff: number
  end: number
}

export interface GvasIndex {
  fields: Map<string, FieldRef>
  boolRefs: Map<string, BoolRef>
  bools: Map<string, boolean>
  strings: Map<string, string>
  arrays: Map<string, ArrayRef>
  maps: Map<string, MapRef>
  tags: Map<string, number>
  end: number
}

const SCALAR_WIDTH: Record<FieldKind, number> = {
  IntProperty: 4,
  UInt32Property: 4,
  Int64Property: 8,
  FloatProperty: 4,
  DoubleProperty: 8,
  Int16Property: 2,
  ByteValue: 1
}

const FLAG_ARRAY_INDEX = 0x01
const FLAG_PROPERTY_GUID = 0x02
const FLAG_BOOL = 0x10
const FLAG_STRUCT_INNER = 0x08

class R {
  readonly d: Uint8Array
  readonly v: DataView
  o = 0

  constructor(d: Uint8Array) {
    this.d = d
    this.v = new DataView(d.buffer, d.byteOffset, d.byteLength)
  }

  private need(n: number): void {
    if (this.o + n > this.d.length) throw new ModuleError('INVALID_FORMAT', ['GVAS eof'])
  }

  i32(): number {
    this.need(4)
    const x = this.v.getInt32(this.o, true)
    this.o += 4
    return x
  }

  u8(): number {
    this.need(1)
    return this.d[this.o++]!
  }

  skip(n: number): void {
    this.need(n)
    this.o += n
  }

  fstring(): string {
    const n = this.i32()
    if (n === 0) return ''
    if (n < 0) {
      const chars = -n
      this.need(chars * 2)
      const s = new TextDecoder('utf-16le').decode(this.d.subarray(this.o, this.o + chars * 2 - 2))
      this.o += chars * 2
      return s
    }
    this.need(n)
    const s = new TextDecoder('utf-8').decode(this.d.subarray(this.o, this.o + n - 1))
    this.o += n
    return s
  }

  type(): TypeName {
    const name = this.fstring()
    const n = this.i32()
    const inner: TypeName[] = []
    for (let i = 0; i < n; i++) inner.push(this.type())
    return { name, inner }
  }
}

function skipGvasHeader(r: R): void {
  if (r.d.length < 4 || String.fromCharCode(r.d[0]!, r.d[1]!, r.d[2]!, r.d[3]!) !== 'GVAS') {
    throw new ModuleError('INVALID_FORMAT', ['GVAS'])
  }
  r.skip(4)
  r.i32()
  r.i32()
  r.i32()
  r.skip(10)
  r.fstring()
  r.i32()
  const n = r.i32()
  r.skip(n * 20)
  r.fstring()
  r.u8()
}

export function parseGvasIndex(plain: Uint8Array): GvasIndex {
  const r = new R(plain)
  skipGvasHeader(r)

  const fields = new Map<string, FieldRef>()
  const boolRefs = new Map<string, BoolRef>()
  const bools = new Map<string, boolean>()
  const strings = new Map<string, string>()
  const arrays = new Map<string, ArrayRef>()
  const maps = new Map<string, MapRef>()
  const tags = new Map<string, number>()
  let flagsOff = 0

  function val(path: string, t: TypeName, size: number | null, flags: number): void {
    const k = t.name
    if (k in SCALAR_WIDTH && k !== 'ByteProperty') {
      fields.set(path, { off: r.o, kind: k as FieldKind })
      r.skip(SCALAR_WIDTH[k as FieldKind]!)
      return
    }
    if (k === 'BoolProperty') {
      if (size === 0) {
        const v = !!(plain[flagsOff]! & FLAG_BOOL)
        bools.set(path, v)
        boolRefs.set(path, { off: flagsOff, tagged: true })
      } else {
        bools.set(path, !!plain[r.o])
        boolRefs.set(path, { off: r.o, tagged: false })
        r.skip(1)
      }
      return
    }
    if (k === 'StrProperty' || k === 'NameProperty' || k === 'EnumProperty') {
      strings.set(path, r.fstring())
      return
    }
    if (k === 'ByteProperty') {
      if (size === 1) {
        fields.set(path, { off: r.o, kind: 'ByteValue' })
        r.skip(1)
      } else {
        strings.set(path, r.fstring())
      }
      return
    }
    if (k === 'ArrayProperty') {
      const c = r.i32()
      const elem = t.inner[0]
      if (!elem) throw new ModuleError('INVALID_FORMAT', ['ArrayProperty'])
      for (let i = 0; i < c; i++) val(`${path}[${i}]`, elem, null, 0)
      return
    }
    if (k === 'MapProperty') {
      const removed = r.i32()
      const keyT = t.inner[0]
      const valT = t.inner[1]
      if (!keyT || !valT) throw new ModuleError('INVALID_FORMAT', ['MapProperty'])
      for (let i = 0; i < removed; i++) val(`${path}{removed}`, keyT, null, 0)
      const c = r.i32()
      for (let i = 0; i < c; i++) {
        val(`${path}{${i}}.key`, keyT, null, 0)
        val(`${path}{${i}}.value`, valT, null, 0)
      }
      return
    }
    if (k === 'StructProperty') {
      const st = t.inner[0]?.name ?? ''
      if (st === 'DateTime') {
        r.skip(8)
        return
      }
      if (st === 'Vector') {
        r.skip(24)
        return
      }
      if (!(flags & FLAG_STRUCT_INNER)) {
        props(path)
        return
      }
    }
    if (size === null) throw new ModuleError('INVALID_FORMAT', [`unsized ${k}`])
    r.skip(size)
  }

  function props(path: string): void {
    for (;;) {
      const name = r.fstring()
      if (name === 'None') return
      const t = r.type()
      const sizeOff = r.o
      const size = r.i32()
      flagsOff = r.o
      const flags = r.u8()
      if (flags & FLAG_ARRAY_INDEX) r.i32()
      if (flags & FLAG_PROPERTY_GUID) r.skip(16)
      const end = r.o + size
      const p = path ? `${path}.${name}` : name
      tags.set(p, sizeOff)
      if (t.name === 'ArrayProperty' && t.inner[0]) {
        arrays.set(p, { countOff: r.o, end, inner: t.inner[0] })
      }
      if (t.name === 'MapProperty') {
        maps.set(p, { countOff: r.o + 4, end })
      }
      try {
        val(p, t, size, flags)
      } catch {
        /* unknown layout: skip by declared size */
      }
      r.o = end
    }
  }

  props('')
  return { fields, boolRefs, bools, strings, arrays, maps, tags, end: r.o }
}

export function getInt(index: GvasIndex, plain: Uint8Array, path: string): number {
  const f = index.fields.get(path)
  if (!f) throw new ModuleError('MISSING_FIELD', [path])
  const v = new DataView(plain.buffer, plain.byteOffset, plain.byteLength)
  switch (f.kind) {
    case 'IntProperty':
      return v.getInt32(f.off, true)
    case 'UInt32Property':
      return v.getUint32(f.off, true)
    case 'Int64Property':
      return Number(v.getBigInt64(f.off, true))
    case 'Int16Property':
      return v.getInt16(f.off, true)
    case 'ByteValue':
      return plain[f.off]!
    case 'FloatProperty':
      return v.getFloat32(f.off, true)
    case 'DoubleProperty':
      return v.getFloat64(f.off, true)
    default:
      throw new ModuleError('INVALID_FORMAT', [path])
  }
}

export function setInt(plain: Uint8Array, index: GvasIndex, path: string, value: number): void {
  const f = index.fields.get(path)
  if (!f) throw new ModuleError('MISSING_FIELD', [path])
  const v = new DataView(plain.buffer, plain.byteOffset, plain.byteLength)
  switch (f.kind) {
    case 'IntProperty':
      v.setInt32(f.off, value | 0, true)
      break
    case 'UInt32Property':
      v.setUint32(f.off, value >>> 0, true)
      break
    case 'Int64Property':
      v.setBigInt64(f.off, BigInt(Math.trunc(value)), true)
      break
    case 'Int16Property':
      v.setInt16(f.off, value | 0, true)
      break
    case 'ByteValue':
      plain[f.off] = value & 0xff
      break
    case 'FloatProperty':
      v.setFloat32(f.off, value, true)
      break
    case 'DoubleProperty':
      v.setFloat64(f.off, value, true)
      break
    default:
      throw new ModuleError('INVALID_FORMAT', [path])
  }
}

/** Keep bytes through `end`, then zero-pad to AES block size (16). */
export function padAes(plain: Uint8Array, end: number, block = 16): Uint8Array {
  let len = end
  const rem = len % block
  if (rem) len += block - rem
  if (plain.length === len && end <= plain.length) return plain.subarray(0, len)
  const out = new Uint8Array(len)
  out.set(plain.subarray(0, Math.min(end, plain.length)))
  return out
}

export function setBool(plain: Uint8Array, ref: BoolRef, value: boolean): void {
  if (ref.tagged) {
    plain[ref.off] = value ? plain[ref.off]! | FLAG_BOOL : plain[ref.off]! & ~FLAG_BOOL
  } else {
    plain[ref.off] = value ? 1 : 0
  }
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function i32Bytes(v: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setInt32(0, v | 0, true)
  return b
}

export function fstringBytes(text: string): Uint8Array {
  const body = new TextEncoder().encode(text + '\0')
  return concatBytes([i32Bytes(body.length), body])
}

/** Minimal IntProperty tag used when appending inventory structs. */
export function intPropertyTag(name: string, value: number): Uint8Array {
  // name + typeName + innerCount(0) + size(4) + flags(0) + int32 value
  const tail = new Uint8Array(13)
  const v = new DataView(tail.buffer)
  v.setInt32(0, 0, true)
  v.setInt32(4, 4, true)
  tail[8] = 0
  v.setInt32(9, value | 0, true)
  return concatBytes([fstringBytes(name), fstringBytes('IntProperty'), tail])
}

export function boolPropertyTag(name: string, value: boolean): Uint8Array {
  // name + typeName + innerCount(0) + size(0) + flags(value in 0x10)
  const tail = new Uint8Array(9)
  const v = new DataView(tail.buffer)
  v.setInt32(0, 0, true)
  v.setInt32(4, 0, true)
  tail[8] = value ? FLAG_BOOL : 0
  return concatBytes([fstringBytes(name), fstringBytes('BoolProperty'), tail])
}

export function noneTag(): Uint8Array {
  return fstringBytes('None')
}

/**
 * Append serialized entry bytes to an ArrayProperty or MapProperty, bumping counts
 * and ancestor tag sizes. Returns a new buffer (AES-padded).
 */
export function appendEntry(
  plain: Uint8Array,
  index: GvasIndex,
  path: string,
  data: Uint8Array,
  kind: 'arrays' | 'maps',
  entryCount = 1
): Uint8Array {
  const arr = kind === 'arrays' ? index.arrays.get(path) : index.maps.get(path)
  if (!arr) throw new ModuleError('MISSING_FIELD', [path])
  const end = index.end
  const out = new Uint8Array(end + data.length + 4 + 16)
  out.set(plain.subarray(0, arr.end), 0)
  out.set(data, arr.end)
  out.set(plain.subarray(arr.end, end), arr.end + data.length)
  const v = new DataView(out.buffer)
  v.setInt32(arr.countOff, v.getInt32(arr.countOff, true) + entryCount, true)
  for (const [tp, sizeOff] of index.tags) {
    if (tp === path || path.startsWith(tp + '.') || path.startsWith(tp + '[')) {
      v.setInt32(sizeOff, v.getInt32(sizeOff, true) + data.length, true)
    }
  }
  let len = end + data.length
  const rem = len % 16
  if (rem) len += 16 - rem
  return out.subarray(0, len)
}

export function inventoryItemBytes(itemId: number, num: number): Uint8Array {
  return concatBytes([intPropertyTag('ItemId', itemId), intPropertyTag('Num', num), noneTag()])
}
