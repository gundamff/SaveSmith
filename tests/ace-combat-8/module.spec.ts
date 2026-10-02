import { describe, expect, it } from 'vitest'
import { modules } from '@host/registry'
import { aceCombat8Module } from '../../src/games/ace-combat-8'
import { loadCampaignPatch, readCampaignView } from '../../src/games/ace-combat-8/model/campaignSave'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

describe('aceCombat8Module catalog / locate / registry', () => {
  it('registers with resources and progress views', () => {
    expect(aceCombat8Module.id).toBe('ace-combat-8')
    expect(aceCombat8Module.views.map((v) => v.id)).toEqual(['resources', 'progress'])
    expect(aceCombat8Module.catalog.steamAppId).toBe(2288340)
    expect(aceCombat8Module.locate.identifyAnyOf).toContain('Campaign.sav')
    expect(modules.map((m) => m.id)).toContain('ace-combat-8')
    expect(modules.at(-1)).toBe(aceCombat8Module)
  })
})

describe('aceCombat8Module parse / actions', () => {
  const relativePath = 'Campaign.sav'
  const bytes = new Uint8Array(readFileSync(join(fixtures, 'campaign-midgame.sav')))

  it('parse loads Campaign.sav', () => {
    const state = aceCombat8Module.parse([{ relativePath, bytes }])
    expect(state.relativePath).toBe(relativePath)
    expect(state.view.currentMrp).toBe(11418420n)
  })

  it('pseudo-ng-plus action resets cursor and unlocks post-clear features', () => {
    const state = aceCombat8Module.parse([{ relativePath, bytes: new Uint8Array(bytes) }])
    aceCombat8Module.applyAction(state, 'pseudo-ng-plus')
    expect(state.view.lastCompletedMissionId).toBe(0)
    expect(state.view.completionCount).toBe(1)
    expect(state.view.unlockedFreeMissionIds).toHaveLength(31)
    const out = aceCombat8Module.serialize(state)
    expect(out).toHaveLength(1)
    const again = readCampaignView(loadCampaignPatch(out[0]!.bytes))
    expect(again.lastCompletedMissionId).toBe(0)
    expect(again.completionCount).toBe(1)
  })
})
