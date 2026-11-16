import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import {
  encodeFieldName,
  findUniqueField,
  validateEnvelope
} from '../../src/games/ball-x-pit/model/binary'
import { buildMinimalSave } from './fixtures'

describe('ball-x-pit binary envelope', () => {
  it('accepts synthetic minimal save', () => {
    const data = buildMinimalSave()
    expect(() => validateEnvelope(data)).not.toThrow()
    expect(data[0]).toBe(0x02)
    expect(data[data.length - 1]).toBe(0x05)
    expect(findUniqueField(data, 'HeroStats')).toBeGreaterThan(0)
  })

  it('rejects bad terminator', () => {
    const data = buildMinimalSave()
    data[data.length - 1] = 0x00
    expect(() => validateEnvelope(data)).toThrow(ModuleError)
  })

  it('encodeFieldName is length-prefixed UTF-16LE', () => {
    const enc = encodeFieldName('Ab')
    expect(enc).toEqual(new Uint8Array([2, 0, 0, 0, 0x41, 0, 0x62, 0]))
  })
})
