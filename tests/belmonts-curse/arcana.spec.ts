import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { arcanaCatalog, arcanaReady } from '../../src/games/belmonts-curse/catalog/arcana'
import { mercyReady, mercyTaskGuids, mercyTalentGuids } from '../../src/games/belmonts-curse/catalog/mercy'
import {
  catalogAddableIdsByCategory,
  isAddableItemId
} from '../../src/games/belmonts-curse/catalog/names'
import { featureFlags } from '../../src/games/belmonts-curse/model/featureFlags'
import { completeAllMercy, unlockAllArcana } from '../../src/games/belmonts-curse/model/arcana'
import { belmontsCurseViews } from '../../src/games/belmonts-curse/views'
import { parse, serialize } from '../../src/games/belmonts-curse/parse'
import { utf8Encode } from '../../src/sdk/session'

const root = join(dirname(fileURLToPath(import.meta.url)))
const fixture = JSON.parse(
  readFileSync(join(root, 'fixtures/minimal-buildsave.json'), 'utf8')
) as Record<string, unknown>

function loadState() {
  const bytes = utf8Encode(JSON.stringify(structuredClone(fixture)))
  return parse([{ relativePath: 'BuildSave_0.sav', bytes }])
}

describe('belmonts-curse views', () => {
  it('exposes overview/character/inventory/tarot only', () => {
    const ids = belmontsCurseViews.map((v) => v.id)
    expect(ids).toEqual(['overview', 'character', 'inventory', 'tarot'])
  })
})

describe('belmonts-curse arcana catalog', () => {
  it('ships 15 Arcana with CharacterID guids and tarot gate', () => {
    expect(arcanaReady()).toBe(true)
    expect(mercyReady()).toBe(true)
    expect(featureFlags.addTarot).toBe(true)
    expect(arcanaCatalog().length).toBe(15)
    expect(arcanaCatalog().every((a) => /^[0-9a-f]{32}$/i.test(a.characterGuid))).toBe(true)
    expect(arcanaCatalog().some((a) => a.characterKey === 'Leon' && a.spellItemID === 'BoomerangCross')).toBe(
      true
    )
    expect(mercyTaskGuids().length).toBeGreaterThanOrEqual(40)
    expect(mercyTalentGuids().length).toBeGreaterThanOrEqual(40)
  })
})

describe('belmonts-curse addable weapon filter', () => {
  it('excludes abstract and Doppelganger weapons from addable weapon ids', () => {
    const weapons = catalogAddableIdsByCategory('weapon')
    expect(weapons).toContain('WeaponFistTier1')
    expect(weapons).toContain('WeaponWhipTier1')
    expect(weapons).not.toContain('WeaponWhip')
    expect(weapons).not.toContain('WeaponFistBase')
    expect(weapons.every((id) => !id.includes('Doppelganger'))).toBe(true)
    expect(isAddableItemId('WeaponWhip')).toBe(false)
    expect(isAddableItemId('WeaponFistTier1')).toBe(true)
    expect(weapons.length).toBeGreaterThanOrEqual(23)
    expect(weapons.length).toBeLessThanOrEqual(28)
  })
})

describe('belmonts-curse unlockAllArcana', () => {
  it('writes characterProgressionSteps, spells, and vaniaMoves', () => {
    const state = loadState()
    const n = unlockAllArcana(state)
    expect(n).toBe(15)
    const ps = state.raw.playerSave as Record<string, unknown>
    const steps = ps.characterProgressionSteps as { m_keys: string[]; m_values: number[] }
    expect(steps.m_keys).toHaveLength(15)
    expect(steps.m_values.every((v) => v >= 4)).toBe(true)
    expect(state.player.itemsInInventory).toContain('BoomerangCross')
    expect(state.player.itemsInInventory).toContain('RageIncarnation')
    expect(state.player.vaniaMoves).toContain('71276b8978cebc848aaf094a91bee40e')
    expect(unlockAllArcana(state)).toBe(0)
    const again = parse([{ relativePath: state.relativePath, bytes: serialize(state)[0]!.bytes }])
    const steps2 = (again.raw.playerSave as Record<string, unknown>).characterProgressionSteps as {
      m_keys: string[]
    }
    expect(steps2.m_keys).toHaveLength(15)
  })
})

describe('belmonts-curse completeAllMercy', () => {
  it('fills arcanaCompletedTasks, seen, and unlocked talents', () => {
    const state = loadState()
    const tasks = mercyTaskGuids()
    const talents = mercyTalentGuids()
    const n = completeAllMercy(state)
    expect(n).toBe(tasks.length)
    expect(state.player.arcanaCompletedTasks).toHaveLength(tasks.length)
    expect(state.player.arcanaUnlockedTalents).toHaveLength(talents.length)
    const ps = state.raw.playerSave as Record<string, unknown>
    expect(ps.arcanaSeenTasks).toEqual(expect.arrayContaining(tasks))
    expect(completeAllMercy(state)).toBe(0)
  })
})
