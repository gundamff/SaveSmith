import { describe, expect, it } from 'vitest'
import {
  clampFighterField,
  clampItemStatAmount,
  clampToBounds,
  fighterFieldBounds,
  fighterFieldInBounds,
  itemStatBounds,
  itemStatInBounds
} from '../../src/games/eslabong/model/bounds'

describe('eslabong bounds (option B)', () => {
  it('itemStatBounds uses table entries and suffix fallbacks', () => {
    expect(itemStatBounds('hp_flat')).toEqual({ min: 0, max: 200 })
    expect(itemStatBounds('basic_melee_damage_taken_perc')).toEqual({ min: -50, max: 0 })
    expect(itemStatBounds('unknown_perc').min).toBe(-50)
    expect(itemStatBounds('unknown_flat').max).toBe(200)
  })

  it('clampItemStatAmount clamps to hard caps', () => {
    expect(clampItemStatAmount('hp_flat', 999)).toBe(200)
    expect(clampItemStatAmount('basic_melee_damage_taken_perc', 10)).toBe(0)
    expect(clampItemStatAmount('basic_melee_damage_taken_perc', -99)).toBe(-50)
  })

  it('fighterFieldBounds treats personality/ai as 0..1 traits', () => {
    const b = fighterFieldBounds('adaptability')
    expect(b).toEqual({ min: 0, max: 1, step: 0.01 })
    expect(fighterFieldInBounds('adaptability', 0.5)).toBe(true)
    expect(fighterFieldInBounds('adaptability', 1.5)).toBe(false)
  })

  it('clampFighterField clamps birth/career scalars', () => {
    expect(clampFighterField('birth_max_hp', 99999)).toBe(3000)
    expect(clampFighterField('career_damage', -5)).toBe(0)
  })

  it('clampToBounds respects fractional steps', () => {
    const bounds = { min: 0, max: 10, step: 0.1 }
    expect(clampToBounds(1.23, bounds)).toBeCloseTo(1.2)
    expect(itemStatInBounds('duration_sec', 5.5)).toBe(true)
    expect(itemStatInBounds('duration_sec', 99)).toBe(false)
  })
})
