import { describe, expect, it } from 'vitest'
import {
  parseEs3Binary,
  serializeEs3Binary,
  setScalar,
  setArray
} from '../../src/games/chaos-galaxy-2/model/es3-binary'

/** Build minimal file: RealYear=2026 int, IsBeginning=false bool, Name="CN" string */
function fixtureMinimal(): Uint8Array {
  // Prefer constructing via serialize once implemented; for failing test, hand-craft hex from design notes:
  // RealYear: 7E 08 ... RealYear 0A000000 FF 5608A8E2 EA070000 7B
  // IsBeginning: 7E 0B ... 07000000 FF 9C7C4DAD 00 7B
  // LangeuageSet-like: 7E 04 4E 61 6D 65 09000000 FF EEF1E9FD 02 43 4E 7B
  const hex = [
    '7E','08','52','65','61','6C','59','65','61','72','0A','00','00','00','FF','56','08','A8','E2','EA','07','00','00','7B',
    '7E','0B','49','73','42','65','67','69','6E','6E','69','6E','67','07','00','00','00','FF','9C','7C','4D','AD','00','7B',
    '7E','04','4E','61','6D','65','09','00','00','00','FF','EE','F1','E9','FD','02','43','4E','7B'
  ]
  return Uint8Array.from(hex.map((h) => parseInt(h, 16)))
}

describe('es3-binary', () => {
  it('parses int/bool/string and round-trips bytes', () => {
    const raw = fixtureMinimal()
    const entries = parseEs3Binary(raw)
    expect(entries.map((e) => e.key)).toEqual(['RealYear', 'IsBeginning', 'Name'])
    expect(entries[0].kind).toBe('int')
    expect(entries[0].value).toBe(2026)
    expect(entries[1].value).toBe(false)
    expect(entries[2].value).toBe('CN')
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('parses bool[] with 0x51 prefix and round-trips', () => {
    // settings=0x010B, 51, FF, boolHash, count=4, 1 0 1 0
    const hex = [
      '7E','04','46','6C','61','67','0B','01','00','00','51','FF','9C','7C','4D','AD',
      '04','00','00','00','01','00','01','00','7B'
    ]
    const raw = Uint8Array.from(hex.map((h) => parseInt(h, 16)))
    const entries = parseEs3Binary(raw)
    expect(entries[0].kind).toBe('bool[]')
    expect(entries[0].value).toEqual([true, false, true, false])
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('setScalar updates int and keeps settings', () => {
    const entries = parseEs3Binary(fixtureMinimal())
    setScalar(entries, 'RealYear', 2099)
    const again = parseEs3Binary(serializeEs3Binary(entries))
    expect(again[0].value).toBe(2099)
    expect(again[0].settings).toBe(0x0a)
  })

  it('preserves opaque payload (0x53) as raw and round-trips bytes', () => {
    // settings=0x0200, 0x53 marker + opaque bytes before 0x7B
    const hex = [
      '7E','04','44','61','74','61','00','02','00','00','53','AA','BB','CC','7B'
    ]
    const raw = Uint8Array.from(hex.map((h) => parseInt(h, 16)))
    const entries = parseEs3Binary(raw)
    expect(entries[0].kind).toBe('raw')
    expect(entries[0].rawPayload).toEqual(new Uint8Array([0x53, 0xaa, 0xbb, 0xcc]))
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('raw 0x53 payload may contain 0x7B data bytes before terminator', () => {
    // Real savedata1.cg2 BuildableUnits: 0x53 list includes unit id 123 (7B 00 00 00) then real 7B 7E
    const hex = [
      '7E','04','44','61','74','61','28','00','00','00',
      '53','FF','56','08','A8','E2','7B','00','00','00','7B',
      '7E','04','4E','65','78','74','0A','00','00','00','FF','56','08','A8','E2','01','00','00','00','7B'
    ]
    const raw = Uint8Array.from(hex.map((h) => parseInt(h, 16)))
    const entries = parseEs3Binary(raw)
    expect(entries.map((e) => e.key)).toEqual(['Data', 'Next'])
    expect(entries[0].kind).toBe('raw')
    expect(entries[0].rawPayload).toEqual(new Uint8Array([0x53, 0xff, 0x56, 0x08, 0xa8, 0xe2, 0x7b, 0x00, 0x00, 0x00]))
    expect(entries[1].kind).toBe('int')
    expect(entries[1].value).toBe(1)
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('falls back to raw when known int[] payload continues past count', () => {
    // Real savedata1.cg2 Faction0PolicyStatus: 0x51 + int hash + count=2 + 2 ints + trailing zeros + 7B
    const extra = Array.from({ length: 16 }, () => '00')
    const hex = [
      '7E',
      '04',
      '44',
      '61',
      '74',
      '61',
      'D3',
      '00',
      '00',
      '00',
      '51',
      'FF',
      '56',
      '08',
      'A8',
      'E2',
      '02',
      '00',
      '00',
      '00',
      '17',
      '00',
      '00',
      '00',
      '01',
      '00',
      '00',
      '00',
      ...extra,
      '7B'
    ]
    const raw = Uint8Array.from(hex.map((h) => parseInt(h, 16)))
    const entries = parseEs3Binary(raw)
    expect(entries[0].kind).toBe('raw')
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('setArray empty preserves bool[] kind on round-trip', () => {
    const hex = [
      '7E','04','46','6C','61','67','0B','01','00','00','51','FF','9C','7C','4D','AD',
      '04','00','00','00','01','00','01','00','7B'
    ]
    const raw = Uint8Array.from(hex.map((h) => parseInt(h, 16)))
    const entries = parseEs3Binary(raw)
    expect(entries[0].kind).toBe('bool[]')

    setArray(entries, 'Flag', [])
    const reserialized = serializeEs3Binary(entries)
    const again = parseEs3Binary(reserialized)

    expect(again[0].kind).toBe('bool[]')
    expect(again[0].value).toEqual([])
    expect([...reserialized.slice(10, 16)]).toEqual([0x51, 0xff, 0x9c, 0x7c, 0x4d, 0xad])
    expect([...reserialized]).toEqual([
      ...raw.slice(0, 16),
      0x00, 0x00, 0x00, 0x00,
      0x7b
    ])
  })
})
