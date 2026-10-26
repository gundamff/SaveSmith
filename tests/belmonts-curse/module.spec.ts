import { describe, expect, it } from 'vitest'
import { modules } from '@host/registry'
import { belmontsCurseModule } from '../../src/games/belmonts-curse'
import { featureFlags } from '../../src/games/belmonts-curse/model/featureFlags'

describe('belmontsCurseModule', () => {
  it('registers with catalog and inventory unlocked when catalog ready', () => {
    expect(belmontsCurseModule.id).toBe('belmonts-curse')
    expect(belmontsCurseModule.catalog.steamAppId).toBe(4231820)
    expect(belmontsCurseModule.catalog.rightsHolder).toMatch(/KONAMI/i)
    expect(featureFlags.addItem).toBe(true)
    expect(featureFlags.addAbility).toBe(false)
    expect(modules.map((m) => m.id)).toContain('belmonts-curse')
    expect(belmontsCurseModule.locate.identifyNameRegex).toContain('BuildSave_')
    expect(belmontsCurseModule.views.map((v) => v.id)).toEqual([
      'overview',
      'character',
      'inventory',
      'abilities',
      'exploration'
    ])
  })
})
