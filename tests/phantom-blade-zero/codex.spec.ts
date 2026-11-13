import { describe, expect, it } from 'vitest'
import { ModuleError } from '../../src/sdk/error'
import { getPbzCodexEnemyById, pbzCodexEnemies } from '../../src/games/phantom-blade-zero/catalog/codexEnemies'
import {
  clearCodexDiscovered,
  clearCodexRevealed,
  createSaveModel,
  projectCodex,
  setCodexDiscovered,
  setCodexRevealed,
  unlockAllCodex,
  type PbzAdvancedState,
  type PbzSaveModel
} from '../../src/games/phantom-blade-zero/model/saveModel'
import { serializeDirtySlots } from '../../src/games/phantom-blade-zero/model/saveModel'

function advancedDoc(discovered: string[] = [], revealed: string[] = []): Record<string, unknown> {
  return {
    Codex: {
      DiscoveredEnemies: [...discovered],
      RevealedEnemies: [...revealed],
      EnemyKillMapIDs: { keep: true }
    },
    BonusCollection: { UnlockedTags: ['keep.tag'], ViewedArt: [], ViewedMusic: [] },
    OtherAccountField: { nested: 1 }
  }
}

function modelWithAdvanced(document: Record<string, unknown>): PbzSaveModel {
  const advanced: PbzAdvancedState = { document, dirty: false }
  return createSaveModel([], advanced)
}

describe('pbz enemy codex model', () => {
  it('projects discover/reveal against the catalog', () => {
    const scavenger = getPbzCodexEnemyById('BP_Monster_Scavenger')!
    const tutorial = getPbzCodexEnemyById('BP_Monster_ZuoShang_Young_Tutorial')!
    const model = modelWithAdvanced(
      advancedDoc([scavenger.enemyClass], [tutorial.enemyClass])
    )
    const view = projectCodex(model)
    expect(view).not.toBeNull()
    expect(view!.discoveredCount).toBe(1)
    expect(view!.revealedCount).toBe(1)
    expect(view!.total).toBe(pbzCodexEnemies.length)
    const scavengerRow = view!.rows.find((r) => r.id === scavenger.id)!
    expect(scavengerRow.discovered).toBe(true)
    expect(scavengerRow.revealed).toBe(false)
    const tutorialRow = view!.rows.find((r) => r.id === tutorial.id)!
    expect(tutorialRow.discovered).toBe(false)
    expect(tutorialRow.revealed).toBe(true)
  })

  it('toggles discover/reveal and rejects unknown classes', () => {
    const scavenger = getPbzCodexEnemyById('BP_Monster_Scavenger')!
    const model = modelWithAdvanced(advancedDoc())
    setCodexDiscovered(model, scavenger.id, true)
    setCodexRevealed(model, scavenger.id, true)
    expect(model.advanced!.dirty).toBe(true)
    const view = projectCodex(model)!
    const row = view.rows.find((r) => r.id === scavenger.id)!
    expect(row.discovered).toBe(true)
    expect(row.revealed).toBe(true)

    expect(() => setCodexDiscovered(model, 'BP_Monster_NotInCatalog', true)).toThrow(ModuleError)
  })

  it('unlocks all discover+reveal and preserves sibling Advanced keys on serialize', () => {
    const model = modelWithAdvanced(advancedDoc())
    unlockAllCodex(model)
    const view = projectCodex(model)!
    expect(view.discoveredCount).toBe(view.total)
    expect(view.revealedCount).toBe(view.total)

    const dirty = serializeDirtySlots(model)
    expect([...dirty.keys()]).toEqual(['__Advanced__'])
    const parsed = JSON.parse(new TextDecoder().decode(dirty.get('__Advanced__')!)) as {
      Codex: { DiscoveredEnemies: string[]; RevealedEnemies: string[]; EnemyKillMapIDs: object }
      BonusCollection: { UnlockedTags: string[] }
      OtherAccountField: { nested: number }
    }
    expect(parsed.Codex.DiscoveredEnemies).toHaveLength(pbzCodexEnemies.length)
    expect(parsed.Codex.RevealedEnemies).toHaveLength(pbzCodexEnemies.length)
    expect(parsed.Codex.EnemyKillMapIDs).toEqual({ keep: true })
    expect(parsed.BonusCollection.UnlockedTags).toEqual(['keep.tag'])
    expect(parsed.OtherAccountField).toEqual({ nested: 1 })
  })

  it('clears discover/reveal arrays', () => {
    const scavenger = getPbzCodexEnemyById('BP_Monster_Scavenger')!
    const model = modelWithAdvanced(advancedDoc([scavenger.enemyClass], [scavenger.enemyClass]))
    clearCodexDiscovered(model)
    clearCodexRevealed(model)
    const view = projectCodex(model)!
    expect(view.discoveredCount).toBe(0)
    expect(view.revealedCount).toBe(0)
  })

  it('returns null projection when Advanced is absent', () => {
    const model = createSaveModel([])
    expect(model.advanced).toBeNull()
    expect(projectCodex(model)).toBeNull()
  })
})
