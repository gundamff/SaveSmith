import { describe, expect, it } from 'vitest'
import { hasBit, setBit } from '../../src/games/dragon-sword/model/bitmask'

describe('uint64 bitmask as decimal string', () => {
  it('setBit/hasBit round-trip on a low bit', () => {
    expect(hasBit('0', 0)).toBe(false)
    expect(setBit('0', 0, true)).toBe('1')
    expect(hasBit('1', 0)).toBe(true)
    expect(setBit('1', 0, false)).toBe('0')
  })

  it('sets recipe-style bit 42 without touching other bits', () => {
    const next = setBit('0', 42, true)
    expect(hasBit(next, 42)).toBe(true)
    expect(hasBit(next, 41)).toBe(false)
    expect(next).toBe(String(2n ** 42n))
  })

  it('treats SQLite signed -1 as all 64 bits set', () => {
    expect(hasBit('-1', 0)).toBe(true)
    expect(hasBit('-1', 63)).toBe(true)
    expect(setBit('-1', 0, false)).toBe('-2')
  })

  it('preserves bit 63 as signed int64 decimal', () => {
    const high = setBit('0', 63, true)
    expect(high).toBe('-9223372036854775808')
    expect(hasBit(high, 63)).toBe(true)
    expect(hasBit(high, 0)).toBe(false)
  })
})
