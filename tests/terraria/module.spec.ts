import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { modules } from '@host/registry'
import { chaosFrontModule } from '../../src/games/chaos-front'
import { chaosGalaxy2Module } from '../../src/games/chaos-galaxy-2'
import { dragonSwordModule } from '../../src/games/dragon-sword'
import { eslabongModule } from '../../src/games/eslabong'
import { terrariaModule } from '../../src/games/terraria'
import { wanderburgModule } from '../../src/games/wanderburg'

const SAMPLE = path.resolve(__dirname, '../fixtures/terraria/sample.plr')

describe('terrariaModule catalog / locate / registry', () => {
  it('registers terraria with character and inventory views', () => {
    expect(terrariaModule.id).toBe('terraria')
    expect(terrariaModule.views.map((v) => v.id)).toEqual(['character', 'inventory'])
    expect(terrariaModule.views.map((v) => v.labelKey)).toEqual([
      'te.tabs.character',
      'te.tabs.inventory'
    ])
    expect(terrariaModule.views.every((v) => v.component != null)).toBe(true)
    expect(terrariaModule.catalog).toMatchObject({
      name: { zh: '泰拉瑞亚', en: 'Terraria' },
      rightsHolder: 'Re-Logic',
      steamAppId: 105600
    })
    expect(terrariaModule.locate).toEqual({
      windowsPathTemplates: [
        '%DOCUMENTS%\\My Games\\Terraria',
        '%USERPROFILE%\\Documents\\My Games\\Terraria'
      ],
      identifyAnyOf: ['Players'],
      slotFilePatterns: ['Players/*.plr']
    })
    expect(modules).toEqual([
      chaosFrontModule,
      chaosGalaxy2Module,
      wanderburgModule,
      terrariaModule,
      dragonSwordModule,
      eslabongModule
    ])
  })
})

describe('terrariaModule parse / serialize', () => {
  const relativePath = 'Players/sample.plr'
  const bytes = new Uint8Array(fs.readFileSync(SAMPLE))

  it('parse decrypts .plr into state', () => {
    const state = terrariaModule.parse([{ relativePath, bytes }])
    expect(state.relativePath).toBe(relativePath)
    expect(state.name).toBe('[皮皮')
    expect(state.statLifeMax).toBe(500)
  })

  it('parse throws MISSING_FIELD without .plr', () => {
    expect(() =>
      terrariaModule.parse([{ relativePath: 'Players/x.txt', bytes: new Uint8Array([1]) }])
    ).toThrow(ModuleError)
  })

  it('serialize round-trips encrypted bytes', () => {
    const state = terrariaModule.parse([{ relativePath, bytes }])
    state.statLife = 350
    const out = terrariaModule.serialize(state)
    expect(out).toHaveLength(1)
    expect(out[0]?.relativePath).toBe(relativePath)
    const again = terrariaModule.parse([{ relativePath, bytes: out[0]!.bytes }])
    expect(again.statLife).toBe(350)
    expect(again.name).toBe(state.name)
  })

  it('listSlots lists Players/*.plr', () => {
    const slots = terrariaModule.listSlots({
      dir: 'x',
      files: [
        { relativePath: 'Players/sample.plr', bytes },
        { relativePath: 'Players/sample.plr.bak', bytes: null },
        { relativePath: 'Worlds/a.wld', bytes: null }
      ]
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]?.title).toBe('[皮皮')
    expect(slots[0]?.sessionFiles).toEqual(['Players/sample.plr'])
  })
})
