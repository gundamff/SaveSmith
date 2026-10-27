import { describe, expect, it } from 'vitest'
import { allowedArmors, allowedWeapons, weaponPrefixForUnit } from '../../src/games/final-fantasy-resonance/catalog/equipment'

describe('ffr equip rules', () => {
  it('maps base party ids to weapon prefixes (Fina = bows 103xx)', () => {
    expect(weaponPrefixForUnit(1001)).toBe(101)
    expect(weaponPrefixForUnit(1003)).toBe(103)
    expect(weaponPrefixForUnit(1008)).toBe(108)
  })

  it('filters Fina weapons to bow prefix only', () => {
    const bows = allowedWeapons(1003, 10301)
    expect(bows.length).toBeGreaterThan(0)
    expect(bows.every((e) => Math.floor(e.id / 100) === 103)).toBe(true)
    expect(bows.some((e) => e.id === 10105)).toBe(false)
  })

  it('filters Rain armor to light/heavy subtypes', () => {
    const armors = allowedArmors(1001)
    expect(armors.every((e) => e.kind === 'armor' && [9, 10].includes(e.subtype))).toBe(true)
  })

  it('filters Fina armor to robe/light subtypes', () => {
    const armors = allowedArmors(1003)
    expect(armors.every((e) => [10, 11].includes(e.subtype))).toBe(true)
  })
})
