import { describe, expect, it } from 'vitest'
import {
  getPbzCodexEnemyByClass,
  getPbzCodexEnemyById,
  isWhitelistedCodexEnemyClass,
  listPbzCodexEnemies,
  pbzCodexEnemyName,
  pbzCodexEnemies,
  searchPbzCodexEnemies
} from '../../src/games/phantom-blade-zero/catalog/codexEnemies'

describe('pbz codex enemies catalog', () => {
  it('ships 177 DT_CodexEnemyDataTable rows with EnemyClass paths', () => {
    expect(pbzCodexEnemies).toHaveLength(177)
    expect(pbzCodexEnemies.every((row) => row.enemyClass.includes('/'))).toBe(true)
    expect(pbzCodexEnemies.filter((row) => row.isBoss).length).toBeGreaterThan(50)
  })

  it('looks up by id and soft-object class', () => {
    const scavenger = getPbzCodexEnemyById('BP_Monster_Scavenger')
    expect(scavenger?.zh).toBe('活人偶清道夫')
    expect(getPbzCodexEnemyByClass(scavenger!.enemyClass)?.id).toBe('BP_Monster_Scavenger')
    expect(isWhitelistedCodexEnemyClass(scavenger!.enemyClass)).toBe(true)
    expect(isWhitelistedCodexEnemyClass('/not/in/catalog')).toBe(false)
  })

  it('lists by displayOrder and searches Chinese names', () => {
    const listed = listPbzCodexEnemies()
    expect(listed[0]!.displayOrder).toBeLessThanOrEqual(listed[1]!.displayOrder)
    expect(searchPbzCodexEnemies('清道夫').some((r) => r.id === 'BP_Monster_Scavenger')).toBe(true)
    expect(pbzCodexEnemyName(scavengerRequired(), 'zh')).toBe('活人偶清道夫')
  })

  it('searches by localized map name and keeps EN enemy names as readable ids', () => {
    expect(searchPbzCodexEnemies('悲泣溪谷').every((r) => r.ownMapId.toLowerCase() === 'xigu')).toBe(
      true
    )
    expect(searchPbzCodexEnemies('Weeping Creek').length).toBeGreaterThan(0)
    expect(pbzCodexEnemyName(scavengerRequired(), 'en')).toBe('Scavenger')
  })
})

function scavengerRequired() {
  const row = getPbzCodexEnemyById('BP_Monster_Scavenger')
  if (!row) throw new Error('missing scavenger')
  return row
}
