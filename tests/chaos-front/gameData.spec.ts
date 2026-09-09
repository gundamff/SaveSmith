import { describe, expect, it } from 'vitest'
import { gameData } from '../../src/games/chaos-front/model/gameData'

describe('game-data.json（提取产物）', () => {
  it('has 92 unit types', () => {
    expect(gameData.unitTypes).toHaveLength(92)
    expect(gameData.unitTypes[0]).toMatchObject({ id: 1, kind: 1, levelType: 3 })
  })
  it('has 12 level tables with valid EXP6', () => {
    expect(Object.keys(gameData.levelTables)).toHaveLength(12)
    const max6 = Object.values(gameData.levelTables).map((t) => t[6])
    expect(Math.max(...max6)).toBe(11970)
  })
  it('every unit type has maxExp >= 2400', () => {
    for (const u of gameData.unitTypes) {
      expect(gameData.unitMaxExp[String(u.id)]).toBeGreaterThanOrEqual(2400)
    }
  })
  it('has characters and items', () => {
    expect(gameData.characters.length).toBeGreaterThan(30)
    expect(gameData.items).toHaveLength(16)
  })
  it('has armies and planets', () => {
    expect(gameData.armies.length).toBe(32)
    expect(gameData.planets).toHaveLength(17)
    expect(gameData.planets[0].name).toBe('马西利亚')
  })
  it('has skills talents abilities weapons', () => {
    expect(gameData.skills.length).toBe(65)
    expect(gameData.talents.length).toBe(56)
    expect(gameData.abilities.length).toBe(28)
    expect(gameData.weapons.length).toBe(53)
    expect(gameData.unitTypes[0].hp).toBe(1000)
    expect(gameData.characters[0].shoot).toBe(22)
    expect(gameData.skills[0].name).toBe('努力')
  })
})
