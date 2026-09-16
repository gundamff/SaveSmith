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
})
