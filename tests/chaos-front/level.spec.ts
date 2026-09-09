import { describe, expect, it } from 'vitest'
import {
  CHARACTER_LEVEL_TABLE,
  CHARACTER_MAX_EXP,
  UNIT_EXP6_FALLBACK,
  UNIT_MAX_LEVEL,
  characterExpForLevel,
  characterLevelForExp,
  unitLevelForExp
} from '../../src/games/chaos-front/model/level'

describe('character levels', () => {
  it('has the exact in-game table', () => {
    expect(CHARACTER_LEVEL_TABLE).toEqual([0, 300, 1050, 2300, 3800, 5800, 8000, 11000, 15000, 20000])
    expect(CHARACTER_MAX_EXP).toBe(20000)
  })

  it('computes level from exp', () => {
    expect(characterLevelForExp(0)).toBe(1)
    expect(characterLevelForExp(299)).toBe(1)
    expect(characterLevelForExp(300)).toBe(2)
    expect(characterLevelForExp(19999)).toBe(9)
    expect(characterLevelForExp(20000)).toBe(10)
    expect(characterLevelForExp(999999)).toBe(10)
  })

  it('computes exp for level', () => {
    expect(characterExpForLevel(1)).toBe(0)
    expect(characterExpForLevel(10)).toBe(20000)
  })
})

describe('unit levels', () => {
  it('computes level 0..6 from table', () => {
    const table = [0, 900, 2100, 3590, 5390, 8380, 11970]
    expect(unitLevelForExp(0, table)).toBe(0)
    expect(unitLevelForExp(900, table)).toBe(1)
    expect(unitLevelForExp(8380, table)).toBe(5)
    expect(unitLevelForExp(8389, table)).toBe(5)
    expect(unitLevelForExp(11970, table)).toBe(6)
    expect(unitLevelForExp(999999, table)).toBe(6)
    expect(UNIT_MAX_LEVEL).toBe(6)
    expect(UNIT_EXP6_FALLBACK).toBe(11970)
  })
})
