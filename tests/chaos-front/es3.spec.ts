import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import {
  getField,
  isWrapped,
  parseEs3,
  parseJsonLoose,
  setField,
  stringifyEs3,
  type Es3Doc
} from '../../src/games/chaos-front/model/es3'

const SAMPLE = JSON.stringify({
  PlayerCredit: { __type: 'int', value: 9788541 },
  PlayerUnits: {
    __type: 'System.Collections.Generic.List`1[[Unit, Assembly-CSharp]],mscorlib',
    value: [
      {
        unitType: 5,
        armyId: 12,
        characterId: 0,
        items: [],
        custom: 0,
        number: [0, 0],
        exp: 7498,
        playerName: ''
      }
    ]
  },
  PlayerMedals: { __type: 'System.Int32[],mscorlib', value: [0, 0, 0, 7200] },
  HistoryTime: { __type: 'string', value: '委员会历28年2月24日' }
})

describe('es3', () => {
  it('parses wrapped fields', () => {
    const doc = parseEs3(SAMPLE)
    expect(doc.PlayerCredit.value).toBe(9788541)
    expect(doc.PlayerCredit.__type).toBe('int')
    expect(doc.PlayerUnits.value).toHaveLength(1)
    expect(doc.HistoryTime.value).toContain('委员会历')
  })

  it('round-trips losslessly', () => {
    const a = parseEs3(SAMPLE)
    const b = parseEs3(stringifyEs3(a))
    expect(b).toEqual(a)
  })

  it('tolerates unwrapped top-level values', () => {
    const doc = parseEs3('{"Foo": 1}')
    expect(doc.Foo.value).toBe(1)
    expect(isWrapped(doc.Foo)).toBe(false)
  })

  it('setField mutates and keeps __type', () => {
    const doc: Es3Doc = parseEs3(SAMPLE)
    setField(doc, 'PlayerCredit', 123)
    expect(doc.PlayerCredit.value).toBe(123)
    expect(doc.PlayerCredit.__type).toBe('int')
    expect(getField<number>(doc, 'PlayerCredit')).toBe(123)
  })

  it('missing key throws ModuleError MISSING_FIELD without Chinese message', () => {
    const doc: Es3Doc = parseEs3(SAMPLE)
    expect(() => getField(doc, 'NoSuchKey')).toThrow(ModuleError)
    expect(() => setField(doc, 'NoSuchKey', 1)).toThrow(ModuleError)
    for (const run of [
      () => getField(doc, 'NoSuchKey'),
      () => setField(doc, 'NoSuchKey', 1)
    ]) {
      try {
        run()
        expect.fail('expected throw')
      } catch (e) {
        expect(e).toBeInstanceOf(ModuleError)
        expect((e as ModuleError).code).toBe('MISSING_FIELD')
        expect(String(e)).not.toContain('ES3 字段缺失')
      }
    }
  })

  it('parses LitJson unquoted integer keys (real save CurrentArmyRanks)', () => {
    const text = '{"CurrentArmyRanks":{"__type":"Dict","value":{11:[3331,2],7:[3022,4]}}}'
    const doc = parseEs3(text)
    expect(doc.CurrentArmyRanks.__type).toBe('Dict')
    expect(getField<Record<string, number[]>>(doc, 'CurrentArmyRanks')).toEqual({
      11: [3331, 2],
      7: [3022, 4]
    })
  })

  it('round-trips LitJson unquoted integer keys with same interpreted value', () => {
    const text = '{"CurrentArmyRanks":{"__type":"Dict","value":{11:[3331,2],7:[3022,4]}}}'
    const a = parseEs3(text)
    const b = parseEs3(stringifyEs3(a))
    expect(b).toEqual(a)
  })

  it('parseJsonLoose quotes bare integer keys only', () => {
    expect(parseJsonLoose('{11:[3331,2],7:[3022,4],"x":1}')).toEqual({
      11: [3331, 2],
      7: [3022, 4],
      x: 1
    })
  })

  it('serializes dictionary keys unquoted (game Read_int requires bare int keys)', () => {
    const text = '{"CurrentArmyRanks":{"__type":"Dict","value":{11:[3331,2],7:[3022,4]}}}'
    const out = stringifyEs3(parseEs3(text))
    expect(out).toMatch(/[{,]\s*11:\s*\[\s*3331,\s*2\s*\]/)
    expect(out).toMatch(/[{,]\s*7:\s*\[\s*3022,\s*4\s*\]/)
    expect(out).not.toContain('"11":')
    expect(out).not.toContain('"7":')
  })

  it('does not unquote keys inside string values', () => {
    const doc = parseEs3('{"Note":{"__type":"string","value":"a, \\"123\\": b"}}')
    const out = stringifyEs3(doc)
    expect(out).toContain('a, \\"123\\": b')
    const back = parseEs3(out)
    expect(getField<string>(back, 'Note')).toBe('a, "123": b')
  })

  it('full save round-trip through unquoted serialization stays stable', () => {
    const text = '{"CurrentArmyRanks":{"__type":"Dict","value":{11:[3331,2],7:[3022,4]}},"PlayerCredit":{"__type":"int","value":1}}'
    const a = parseEs3(text)
    const once = parseEs3(stringifyEs3(a))
    const twice = parseEs3(stringifyEs3(once))
    expect(twice).toEqual(a)
    expect(stringifyEs3(once)).toBe(stringifyEs3(a))
  })
})
