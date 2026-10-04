import { ModuleError } from '@sdk/error'
import { computePackedChecksum } from './gvas'

/** UE 5.4 GVAS tree matching ac8-save-editor Reader/Writer. */
const BINARY_STRUCTS = new Set([
  'Vector',
  'Rotator',
  'Quat',
  'Guid',
  'DateTime',
  'Timespan',
  'LinearColor',
  'Vector2D',
  'Transform',
  'IntPoint',
  'Color',
  'Vector4',
  'Box',
  'Box2D',
  'IntVector',
  'SoftObjectPath'
])

const HAS_ARRAY_INDEX = 0x01
const HAS_PROPERTY_GUID = 0x02
const BOOL_TRUE = 0x10
const GVAS_MAGIC = 0x53415647

export interface TypeName {
  name: string
  inner: TypeName[]
}

export type GvasValue =
  | { k: 'int'; kind: string; v: bigint }
  | { k: 'float'; dbl: boolean; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'str'; v: string; utf16: boolean }
  | { k: 'enum'; v: string }
  | { k: 'byte'; v: number }
  | { k: 'raw'; data: Uint8Array }
  | { k: 'struct'; props: GvasProp[] }
  | { k: 'array'; elem: TypeName; items: GvasValue[] }
  | { k: 'set'; elem: TypeName; removed: number; items: GvasValue[] }
  | { k: 'map'; key: TypeName; val: TypeName; removed: number; items: Array<{ key: GvasValue; val: GvasValue }> }

export interface GvasProp {
  name: string
  type: TypeName
  flags: number
  arrayIndex: number
  guid: Uint8Array | null
  value: GvasValue
}

export interface CampaignSaveFile {
  header: Uint8Array
  savedVersion: number
  sections: GvasProp[][]
}

class R {
  readonly d: Uint8Array
  readonly v: DataView
  o: number

  constructor(d: Uint8Array, o = 0) {
    this.d = d
    this.v = new DataView(d.buffer, d.byteOffset, d.byteLength)
    this.o = o
  }

  private need(n: number): void {
    if (this.o + n > this.d.length) throw new ModuleError('INVALID_FORMAT', ['UE54'])
  }

  i32(): number {
    this.need(4)
    const x = this.v.getInt32(this.o, true)
    this.o += 4
    return x
  }

  u32(): number {
    this.need(4)
    const x = this.v.getUint32(this.o, true)
    this.o += 4
    return x
  }

  i64(): bigint {
    this.need(8)
    const x = this.v.getBigInt64(this.o, true)
    this.o += 8
    return x
  }

  u8(): number {
    this.need(1)
    return this.d[this.o++]!
  }

  bytes(n: number): Uint8Array {
    this.need(n)
    const s = this.d.subarray(this.o, this.o + n)
    this.o += n
    return s
  }

  fstring(): { s: string; utf16: boolean } {
    const len = this.i32()
    if (len === 0) return { s: '', utf16: false }
    if (len < 0) {
      const n = -len
      const raw = this.bytes(n * 2)
      let s = ''
      for (let i = 0; i < n - 1; i++) s += String.fromCharCode(raw[i * 2]! | (raw[i * 2 + 1]! << 8))
      return { s, utf16: true }
    }
    const raw = this.bytes(len)
    let s = ''
    for (let i = 0; i < len - 1; i++) s += String.fromCharCode(raw[i]!)
    return { s, utf16: false }
  }

  typeName(): TypeName {
    const name = this.fstring().s
    const n = this.i32()
    if (n < 0 || n > 8) throw new ModuleError('INVALID_FORMAT', ['TypeName'])
    const inner: TypeName[] = []
    for (let i = 0; i < n; i++) inner.push(this.typeName())
    return { name, inner }
  }

  properties(): GvasProp[] {
    const list: GvasProp[] = []
    for (;;) {
      const p = this.property()
      if (!p) return list
      list.push(p)
    }
  }

  property(): GvasProp | null {
    const name = this.fstring().s
    if (name === 'None') return null
    const type = this.typeName()
    const size = this.i32()
    const flags = this.u8()
    let arrayIndex = 0
    let guid: Uint8Array | null = null
    if (flags & HAS_ARRAY_INDEX) arrayIndex = this.i32()
    if (flags & HAS_PROPERTY_GUID) guid = this.bytes(16)
    const start = this.o
    const value = this.readValue(type, size, flags)
    if (this.o !== start + size) {
      throw new ModuleError('INVALID_FORMAT', [`${name}:${this.o - start}/${size}`])
    }
    return { name, type, flags, arrayIndex, guid, value }
  }

  private readElem(t: TypeName): GvasValue {
    switch (t.name) {
      case 'BoolProperty':
        return { k: 'bool', v: this.u8() !== 0 }
      case 'ByteProperty':
        if (t.inner.length > 0) return { k: 'enum', v: this.fstring().s }
        return { k: 'byte', v: this.u8() }
      case 'EnumProperty':
        return { k: 'enum', v: this.fstring().s }
      case 'StructProperty': {
        const sn = t.inner[0]?.name ?? ''
        if (BINARY_STRUCTS.has(sn)) throw new ModuleError('INVALID_FORMAT', [sn])
        return { k: 'struct', props: this.properties() }
      }
      default:
        return this.readValue(t, -1, 0)
    }
  }

  private readValue(t: TypeName, size: number, flags: number): GvasValue {
    switch (t.name) {
      case 'BoolProperty':
        return { k: 'bool', v: (flags & BOOL_TRUE) !== 0 }
      case 'IntProperty':
        return { k: 'int', kind: t.name, v: BigInt(this.i32()) }
      case 'UInt32Property':
        return { k: 'int', kind: t.name, v: BigInt(this.u32()) }
      case 'Int64Property':
        return { k: 'int', kind: t.name, v: this.i64() }
      case 'UInt64Property':
        this.need(8)
        {
          const x = this.v.getBigUint64(this.o, true)
          this.o += 8
          return { k: 'int', kind: t.name, v: x }
        }
      case 'Int16Property':
      case 'UInt16Property':
        this.need(2)
        {
          const x = this.v.getUint16(this.o, true)
          this.o += 2
          return { k: 'int', kind: t.name, v: BigInt(x) }
        }
      case 'Int8Property':
        return { k: 'int', kind: t.name, v: BigInt(this.u8()) }
      case 'FloatProperty':
        this.need(4)
        {
          const x = this.v.getFloat32(this.o, true)
          this.o += 4
          return { k: 'float', dbl: false, v: x }
        }
      case 'DoubleProperty':
        this.need(8)
        {
          const x = this.v.getFloat64(this.o, true)
          this.o += 8
          return { k: 'float', dbl: true, v: x }
        }
      case 'StrProperty':
      case 'NameProperty':
      case 'SoftObjectProperty': {
        const st = this.fstring()
        return { k: 'str', v: st.s, utf16: st.utf16 }
      }
      case 'EnumProperty':
        return { k: 'enum', v: this.fstring().s }
      case 'ByteProperty':
        if (size === 1) return { k: 'byte', v: this.u8() }
        return { k: 'enum', v: this.fstring().s }
      case 'StructProperty': {
        const sn = t.inner[0]?.name ?? ''
        if (BINARY_STRUCTS.has(sn)) {
          if (size < 0) throw new ModuleError('INVALID_FORMAT', [sn])
          return { k: 'raw', data: this.bytes(size) }
        }
        return { k: 'struct', props: this.properties() }
      }
      case 'ArrayProperty':
        return this.readArray(t, size)
      case 'SetProperty':
        return this.readSet(t)
      case 'MapProperty':
        return this.readMap(t)
      default:
        if (size < 0) throw new ModuleError('INVALID_FORMAT', [t.name])
        return { k: 'raw', data: this.bytes(size) }
    }
  }

  private readArray(t: TypeName, size: number): GvasValue {
    const elem = t.inner[0]
    if (!elem) throw new ModuleError('INVALID_FORMAT', ['ArrayProperty'])
    const n = this.i32()
    const end = this.o - 4 + size
    if (elem.name === 'ByteProperty' && elem.inner.length === 0) {
      return { k: 'array', elem, items: [{ k: 'raw', data: this.bytes(n) }] }
    }
    if (elem.name === 'StructProperty') {
      const sn = elem.inner[0]?.name ?? ''
      if (BINARY_STRUCTS.has(sn)) {
        const each = n === 0 ? 0 : Math.floor((end - this.o) / n)
        const items: GvasValue[] = []
        for (let i = 0; i < n; i++) items.push({ k: 'raw', data: this.bytes(each) })
        return { k: 'array', elem, items }
      }
    }
    if (n < 0 || n > 100000) throw new ModuleError('INVALID_FORMAT', ['ArrayCount'])
    const items: GvasValue[] = []
    for (let i = 0; i < n; i++) items.push(this.readElem(elem))
    return { k: 'array', elem, items }
  }

  private readSet(t: TypeName): GvasValue {
    const removed = this.i32()
    if (removed !== 0) throw new ModuleError('INVALID_FORMAT', ['SetRemoved'])
    const n = this.i32()
    const elem = t.inner[0]
    if (!elem || n < 0 || n > 100000) throw new ModuleError('INVALID_FORMAT', ['SetProperty'])
    const items: GvasValue[] = []
    for (let i = 0; i < n; i++) items.push(this.readElem(elem))
    return { k: 'set', elem, removed, items }
  }

  private readMap(t: TypeName): GvasValue {
    const removed = this.i32()
    if (removed !== 0) throw new ModuleError('INVALID_FORMAT', ['MapRemoved'])
    const n = this.i32()
    const key = t.inner[0]
    const val = t.inner[1]
    if (!key || !val || n < 0 || n > 100000) throw new ModuleError('INVALID_FORMAT', ['MapProperty'])
    const items: Array<{ key: GvasValue; val: GvasValue }> = []
    for (let i = 0; i < n; i++) items.push({ key: this.readElem(key), val: this.readElem(val) })
    return { k: 'map', key, val, removed, items }
  }
}

class W {
  buf = new Uint8Array(256)
  o = 0

  private grow(n: number): void {
    if (this.o + n <= this.buf.length) return
    let cap = this.buf.length
    while (cap < this.o + n) cap *= 2
    const next = new Uint8Array(cap)
    next.set(this.buf.subarray(0, this.o))
    this.buf = next
  }

  i32(v: number): void {
    this.grow(4)
    new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setInt32(this.o, v, true)
    this.o += 4
  }

  u32(v: number): void {
    this.grow(4)
    new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setUint32(this.o, v >>> 0, true)
    this.o += 4
  }

  i64(v: bigint): void {
    this.grow(8)
    new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setBigInt64(this.o, v, true)
    this.o += 8
  }

  u64(v: bigint): void {
    this.grow(8)
    new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setBigUint64(this.o, v, true)
    this.o += 8
  }

  u8(v: number): void {
    this.grow(1)
    this.buf[this.o++] = v & 0xff
  }

  raw(b: Uint8Array): void {
    this.grow(b.length)
    this.buf.set(b, this.o)
    this.o += b.length
  }

  fstring(s: string, utf16 = false): void {
    if (s.length === 0) {
      this.i32(0)
      return
    }
    let ascii = true
    for (let i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) >= 0x80) {
        ascii = false
        break
      }
    }
    if (!utf16 && ascii) {
      this.i32(s.length + 1)
      this.grow(s.length + 1)
      for (let i = 0; i < s.length; i++) this.buf[this.o++] = s.charCodeAt(i)
      this.buf[this.o++] = 0
      return
    }
    this.i32(-(s.length + 1))
    this.grow((s.length + 1) * 2)
    const dv = new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength)
    for (let i = 0; i < s.length; i++) {
      dv.setUint16(this.o, s.charCodeAt(i), true)
      this.o += 2
    }
    dv.setUint16(this.o, 0, true)
    this.o += 2
  }

  typeName(t: TypeName): void {
    this.fstring(t.name)
    this.i32(t.inner.length)
    for (const i of t.inner) this.typeName(i)
  }

  properties(props: GvasProp[]): void {
    for (const p of props) this.property(p)
    this.fstring('None')
  }

  property(p: GvasProp): void {
    this.fstring(p.name)
    this.typeName(p.type)
    const payload = new W()
    let flags = p.flags & ~BOOL_TRUE
    if (p.value.k === 'bool') {
      if (p.value.v) flags |= BOOL_TRUE
    } else {
      payload.value(p.type, p.value)
    }
    const bytes = payload.toArray()
    this.i32(bytes.length)
    this.u8(flags)
    if (flags & HAS_ARRAY_INDEX) this.i32(p.arrayIndex)
    if (flags & HAS_PROPERTY_GUID) this.raw(p.guid ?? new Uint8Array(16))
    this.raw(bytes)
  }

  value(_t: TypeName, v: GvasValue): void {
    switch (v.k) {
      case 'int':
        switch (v.kind) {
          case 'IntProperty':
            this.i32(Number(v.v))
            return
          case 'UInt32Property':
            this.u32(Number(v.v))
            return
          case 'Int64Property':
            this.i64(v.v)
            return
          case 'UInt64Property':
            this.u64(v.v)
            return
          case 'Int16Property':
          case 'UInt16Property':
            this.grow(2)
            new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setUint16(
              this.o,
              Number(v.v) & 0xffff,
              true
            )
            this.o += 2
            return
          case 'Int8Property':
            this.u8(Number(v.v))
            return
          default:
            throw new ModuleError('INVALID_FORMAT', [v.kind])
        }
      case 'float':
        if (v.dbl) {
          this.grow(8)
          new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setFloat64(this.o, v.v, true)
          this.o += 8
        } else {
          this.grow(4)
          new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength).setFloat32(this.o, v.v, true)
          this.o += 4
        }
        return
      case 'str':
        this.fstring(v.v, v.utf16)
        return
      case 'enum':
        this.fstring(v.v)
        return
      case 'byte':
        this.u8(v.v)
        return
      case 'raw':
        this.raw(v.data)
        return
      case 'struct':
        this.properties(v.props)
        return
      case 'array':
        this.array(v)
        return
      case 'set':
        this.i32(v.removed)
        this.i32(v.items.length)
        for (const e of v.items) this.elem(v.elem, e)
        return
      case 'map':
        this.i32(v.removed)
        this.i32(v.items.length)
        for (const e of v.items) {
          this.elem(v.key, e.key)
          this.elem(v.val, e.val)
        }
        return
      case 'bool':
        this.u8(v.v ? 1 : 0)
        return
    }
  }

  private elem(t: TypeName, v: GvasValue): void {
    if (v.k === 'bool') {
      this.u8(v.v ? 1 : 0)
      return
    }
    if (v.k === 'enum') {
      this.fstring(v.v)
      return
    }
    if (v.k === 'byte') {
      this.u8(v.v)
      return
    }
    if (v.k === 'struct') {
      this.properties(v.props)
      return
    }
    this.value(t, v)
  }

  private array(a: Extract<GvasValue, { k: 'array' }>): void {
    if (a.elem.name === 'ByteProperty' && a.elem.inner.length === 0) {
      const raw = a.items[0]
      if (!raw || raw.k !== 'raw') throw new ModuleError('INVALID_FORMAT', ['ByteArray'])
      this.i32(raw.data.length)
      this.raw(raw.data)
      return
    }
    this.i32(a.items.length)
    for (const e of a.items) this.elem(a.elem, e)
  }

  toArray(): Uint8Array {
    return this.buf.subarray(0, this.o)
  }
}

export function loadCampaignSave(bytes: Uint8Array): CampaignSaveFile {
  const r = new R(bytes, 0)
  if (r.u32() !== GVAS_MAGIC) throw new ModuleError('INVALID_FORMAT', ['GVAS'])
  r.i32()
  r.i32()
  r.i32()
  r.bytes(10)
  r.fstring()
  r.i32()
  const nver = r.i32()
  r.bytes(nver * 20)
  r.fstring()
  r.u8()
  const header = bytes.slice(0, r.o)
  const sv = r.property()
  if (!sv || sv.name !== 'SavedVersion' || sv.value.k !== 'int') {
    throw new ModuleError('MISSING_FIELD', ['SavedVersion'])
  }
  const pd = r.property()
  if (!pd || pd.name !== 'PackedData' || pd.value.k !== 'array') {
    throw new ModuleError('MISSING_FIELD', ['PackedData'])
  }
  const blob = pd.value.items[0]
  if (!blob || blob.k !== 'raw') throw new ModuleError('MISSING_FIELD', ['PackedData'])
  const ck = r.property()
  if (!ck || ck.name !== 'Checksum') throw new ModuleError('MISSING_FIELD', ['Checksum'])
  const inner = new R(blob.data, 0)
  const sections: GvasProp[][] = []
  while (inner.o < blob.data.length) sections.push(inner.properties())
  if (inner.o !== blob.data.length) throw new ModuleError('INVALID_FORMAT', ['PackedData.trailing'])
  return { header, savedVersion: Number(sv.value.v), sections }
}

function packedBytes(sf: CampaignSaveFile): Uint8Array {
  const w = new W()
  for (const sec of sf.sections) w.properties(sec)
  return w.toArray()
}

export function saveCampaignSave(sf: CampaignSaveFile): Uint8Array {
  const packed = packedBytes(sf)
  const crc = computePackedChecksum(packed)
  const w = new W()
  w.raw(sf.header)
  w.property({
    name: 'SavedVersion',
    type: { name: 'IntProperty', inner: [] },
    flags: 0,
    arrayIndex: 0,
    guid: null,
    value: { k: 'int', kind: 'IntProperty', v: BigInt(sf.savedVersion) }
  })
  w.property({
    name: 'PackedData',
    type: { name: 'ArrayProperty', inner: [{ name: 'ByteProperty', inner: [] }] },
    flags: 0,
    arrayIndex: 0,
    guid: null,
    value: { k: 'array', elem: { name: 'ByteProperty', inner: [] }, items: [{ k: 'raw', data: packed }] }
  })
  w.property({
    name: 'Checksum',
    type: { name: 'UInt32Property', inner: [] },
    flags: 0,
    arrayIndex: 0,
    guid: null,
    value: { k: 'int', kind: 'UInt32Property', v: BigInt(crc >>> 0) }
  })
  w.fstring('None')
  w.i32(0)
  return w.toArray()
}

/** Parse + serialize like ac8-save-editor Writer.Save so ancestor Size fields stay consistent. */
export function rewriteCampaignSave(bytes: Uint8Array): Uint8Array {
  return saveCampaignSave(loadCampaignSave(bytes))
}

export function findNamedArray(sf: CampaignSaveFile, name: string): Extract<GvasValue, { k: 'array' }> | null {
  for (const sec of sf.sections) {
    for (const p of sec) {
      if (p.name === name && p.value.k === 'array') return p.value
    }
  }
  return null
}

export function setContainsU32OnSave(sf: CampaignSaveFile, name: string, id: number, present: boolean): void {
  const a = findNamedArray(sf, name)
  if (!a) throw new ModuleError('MISSING_FIELD', [name])
  const want = BigInt(id >>> 0)
  const idx = a.items.findIndex((e) => e.k === 'int' && e.v === want)
  if (present && idx < 0) {
    a.items.push({ k: 'int', kind: a.elem.name, v: want })
  } else if (!present && idx >= 0) {
    a.items.splice(idx, 1)
  }
}

export function setOwnedAircraftOnSave(
  sf: CampaignSaveFile,
  id: number,
  owned: boolean,
  flags = 4
): void {
  let map: Extract<GvasValue, { k: 'map' }> | null = null
  for (const sec of sf.sections) {
    for (const p of sec) {
      if (p.name === 'OwnedAircrafts' && p.value.k === 'map') map = p.value
    }
  }
  if (!map) throw new ModuleError('MISSING_FIELD', ['OwnedAircrafts'])
  const want = BigInt(id >>> 0)
  const idx = map.items.findIndex((e) => e.key.k === 'int' && e.key.v === want)
  if (owned && idx < 0) {
    map.items.push({
      key: { k: 'int', kind: 'UInt32Property', v: want },
      val: { k: 'byte', v: flags }
    })
  } else if (!owned && idx >= 0) {
    map.items.splice(idx, 1)
  }
  setContainsU32OnSave(sf, 'NewlyOwnedAircrafts', id, owned)
}

export function assertPackedDataUe54(bytes: Uint8Array): void {
  loadCampaignSave(bytes)
}
