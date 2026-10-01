import { describe, expect, it } from 'vitest'
import {
  asArray,
  asBool,
  asInt,
  asObject,
  asString,
  decodeHxs,
  encodeHxs,
  encodeInt,
  HxFormatError,
  setBoolValue,
  setIntValue,
  setStringValue,
  type HxValue
} from '../../src/games/dead-cells/model/hxbit'

// --------------------------------------------------------------- fixture IO

const parts: Uint8Array[] = []

function push(...bs: (Uint8Array | number[])[]): void {
  for (const b of bs) parts.push(b instanceof Uint8Array ? b : new Uint8Array(b))
}
function u8(v: number): number[] {
  return [v]
}
function str(s: string): Uint8Array {
  const body = new TextEncoder().encode(s)
  return new Uint8Array([body.length + 1, ...body])
}
function varint(v: number): Uint8Array {
  return encodeInt(v)
}
function kindByte(name: string): number {
  const order = [
    'PInt', 'PFloat', 'PBool', 'PString', 'PBytes', 'PSerializable', 'PEnum',
    'PMap', 'PArray', 'PObj', 'PAlias', 'PVector', 'PNull', 'PUnknown',
    'PDynamic', 'PInt64', 'PFlags', 'PCustom', 'PSerInterface', 'POldStruct',
    'PAliasCDB', 'PNoSave', 'PStruct'
  ]
  return order.indexOf(name) + 1
}
function simpleType(name: string): number[] {
  return u8(kindByte(name))
}
function namedType(name: string, className: string): Uint8Array {
  return new Uint8Array([kindByte(name), ...str(className)])
}
function arrayType(inner: number[]): number[] {
  return [kindByte('PArray'), ...inner]
}
function mapType(k: number[], v: number[]): number[] {
  return [kindByte('PMap'), ...k, ...v]
}
function enumType(name: string): Uint8Array {
  return namedType('PEnum', name)
}

/**
 * Fixture layout:
 *   User { name: String, gold: Int, flag: Bool, item: Serializable<Item>,
 *          list: Array<Int>, counters: Map<String,Int>, rank: Enum<UserFlag> }
 *   Item { id: String, qty: Int }
 */
function buildFixture(): Uint8Array {
  parts.length = 0
  push(str('HXS'), u8(1))
  // class table
  push(str('User'), u8(0), u8(6), u8(0), u8(0), u8(0), u8(0))
  push(str('Item'), u8(0), u8(7), u8(0), u8(0), u8(0), u8(0))
  push(u8(0)) // null terminator

  const userTypes = [
    simpleType('PString'),
    simpleType('PInt'),
    simpleType('PBool'),
    namedType('PSerializable', 'Item'),
    arrayType(simpleType('PInt')),
    mapType(simpleType('PString'), simpleType('PInt')),
    enumType('UserFlag')
  ]
  const itemTypes = [simpleType('PString'), simpleType('PInt')]

  const schemaBody: Uint8Array[] = []
  const s = (...xs: (Uint8Array | number[])[]): void => {
    for (const x of xs) schemaBody.push(x instanceof Uint8Array ? x : new Uint8Array(x))
  }
  // schema 1: User (uid=1, clid=1)
  s(varint(1), varint(1), varint(8))
  for (const n of ['name', 'gold', 'flag', 'item', 'list', 'counters', 'rank']) s(str(n))
  s(varint(userTypes.length + 1))
  for (const t of userTypes) s(t)
  // schema 2: Item (uid=2, clid=2)
  s(varint(2), varint(2), varint(3))
  for (const n of ['id', 'qty']) s(str(n))
  s(varint(itemTypes.length + 1))
  for (const t of itemTypes) s(t)

  let schemaLen = 0
  for (const x of schemaBody) schemaLen += x.length
  push(varint(schemaLen))
  push(...schemaBody)

  // object data: root User (uid=1)
  push(varint(1))
  push(str('hero')) // name
  push(new Uint8Array([0x80, 0x39, 0x30, 0x00, 0x00])) // gold = 12345
  push(u8(1)) // flag = true
  push(varint(2)) // item ref uid=2 (new)
  push(str('sword')) // Item.id
  push(varint(7)) // Item.qty
  push(varint(4)) // list count+1 = 4 -> 3 items
  push(varint(1), varint(2), varint(3))
  push(varint(2)) // counters count+1 = 2 -> 1 entry
  push(str('kills'), varint(10))
  push(u8(2)) // rank enum ctor = 1 (UserFlag.CollectorLeft)
  return concat()
}

function concat(): Uint8Array {
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

// ------------------------------------------------------------------- tests

describe('dead-cells hxbit codec', () => {
  it('decodes the fixture object graph', () => {
    const doc = decodeHxs(buildFixture(), 'User')
    expect(doc.opaque).toBe(false)
    const root = doc.root!
    expect(root.className).toBe('User')
    expect(asString(root.fields.get('name'))).toBe('hero')
    expect(asInt(root.fields.get('gold'))).toBe(12345)
    expect(asBool(root.fields.get('flag'))).toBe(true)
    const item = asObject(root.fields.get('item'))!
    expect(item.className).toBe('Item')
    expect(asString(item.fields.get('id'))).toBe('sword')
    expect(asInt(item.fields.get('qty'))).toBe(7)
    const list = asArray(root.fields.get('list'))!
    expect(list.map((v) => asInt(v))).toEqual([1, 2, 3])
    const counters = root.fields.get('counters')!
    expect(counters.kind).toBe('map')
    if (counters.kind === 'map') {
      expect(counters.entries).toHaveLength(1)
      expect(asString(counters.entries[0]!.key)).toBe('kills')
      expect(asInt(counters.entries[0]!.value)).toBe(10)
    }
    const rank = root.fields.get('rank')!
    expect(rank.kind).toBe('enum')
    if (rank.kind === 'enum') {
      expect(rank.enumName).toBe('UserFlag')
      expect(rank.ctor).toBe(1)
      expect(rank.ctorName).toBe('CollectorLeft')
    }
  })

  it('round-trips byte-identical without edits', () => {
    const original = buildFixture()
    const doc = decodeHxs(original, 'User')
    expect(encodeHxs(doc)).toEqual(original)
  })

  it('patches scalar leaves and reparses', () => {
    const doc = decodeHxs(buildFixture(), 'User')
    const root = doc.root!
    setIntValue(doc, root.fields.get('gold') as Extract<HxValue, { kind: 'int' }>, 999)
    setStringValue(
      doc,
      root.fields.get('name') as Extract<HxValue, { kind: 'string' }>,
      'villain'
    )
    setBoolValue(doc, root.fields.get('flag') as Extract<HxValue, { kind: 'bool' }>, false)
    const item = asObject(root.fields.get('item'))!
    setIntValue(doc, item.fields.get('qty') as Extract<HxValue, { kind: 'int' }>, 42)

    const out = encodeHxs(doc)
    const again = decodeHxs(out, 'User')
    const r = again.root!
    expect(asInt(r.fields.get('gold'))).toBe(999)
    expect(asString(r.fields.get('name'))).toBe('villain')
    expect(asBool(r.fields.get('flag'))).toBe(false)
    expect(asInt(asObject(r.fields.get('item'))!.fields.get('qty'))).toBe(42)
    // untouched fields survive
    expect(asArray(r.fields.get('list'))!.map((v) => asInt(v))).toEqual([1, 2, 3])
  })

  it('supports resizing a patched value (varint width change)', () => {
    const doc = decodeHxs(buildFixture(), 'User')
    setIntValue(doc, doc.root!.fields.get('gold') as Extract<HxValue, { kind: 'int' }>, 5)
    const out = encodeHxs(doc)
    expect(asInt(decodeHxs(out, 'User').root!.fields.get('gold'))).toBe(5)
  })

  it('rejects non-HXS data', () => {
    expect(() => decodeHxs(new Uint8Array([1, 2, 3, 4, 5]), 'User')).toThrow(HxFormatError)
  })

  it('falls back to opaque on unsupported object data', () => {
    const fixture = buildFixture()
    // corrupt: truncate the object data region
    const truncated = fixture.slice(0, fixture.length - 6)
    const doc = decodeHxs(truncated, 'User')
    expect(doc.opaque).toBe(true)
    expect(encodeHxs(doc)).toEqual(truncated)
  })
})
