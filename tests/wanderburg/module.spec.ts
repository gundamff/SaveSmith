import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { modules } from '@host/registry'
import { chaosFrontModule } from '../../src/games/chaos-front'
import { wanderburgModule } from '../../src/games/wanderburg'

describe('wanderburgModule catalog / locate / registry', () => {
  it('registers as wanderburg with catalog, locate, and two placeholder views', () => {
    expect(wanderburgModule.id).toBe('wanderburg')
    expect(wanderburgModule.views.map((v) => v.id)).toEqual(['resources', 'unlock'])
    expect(wanderburgModule.views.map((v) => v.labelKey)).toEqual([
      'wb.tabs.resources',
      'wb.tabs.unlock'
    ])
    expect(wanderburgModule.views.every((v) => v.component != null)).toBe(true)
    expect(wanderburgModule.catalog).toMatchObject({
      name: { zh: 'Wanderburg', en: 'Wanderburg' },
      rightsHolder: 'Randwerk',
      developer: 'Randwerk',
      publisher: 'Sidekick Publishing',
      steamAppId: 3624140,
      summary: {
        zh: '非官方存档修改器。Early Access 格式可能变更；请先退出游戏再改档。',
        en: 'Unofficial save editor. Early Access formats may change. Quit the game before editing.'
      }
    })
    expect(wanderburgModule.catalog.cover.length).toBeGreaterThan(0)
    expect(wanderburgModule.locate).toEqual({
      windowsPathTemplates: ['%USERPROFILE%\\AppData\\LocalLow\\Randwerk\\Wanderburg'],
      identifyAnyOf: ['Saves'],
      slotFilePatterns: ['Saves/Playtest/Generation_*/SaveData.json']
    })
    expect(modules).toEqual([chaosFrontModule, wanderburgModule])
  })
})

describe('wanderburgModule parse stub', () => {
  it('parse throws DECRYPT_FAILED until crypto is wired', () => {
    expect(() =>
      wanderburgModule.parse([
        {
          relativePath: 'Saves/Playtest/Generation_0001/SaveData.json',
          bytes: new Uint8Array([1])
        }
      ])
    ).toThrow(ModuleError)
    try {
      wanderburgModule.parse([
        {
          relativePath: 'Saves/Playtest/Generation_0001/SaveData.json',
          bytes: new Uint8Array([1])
        }
      ])
    } catch (e) {
      expect(e).toMatchObject({ code: 'DECRYPT_FAILED', args: [] })
    }
  })

  it('serialize throws DECRYPT_FAILED', () => {
    expect(() => wanderburgModule.serialize({} as never)).toThrow(ModuleError)
    try {
      wanderburgModule.serialize({} as never)
    } catch (e) {
      expect(e).toMatchObject({ code: 'DECRYPT_FAILED', args: [] })
    }
  })

  it('actions is empty and applyAction is identity', () => {
    const state = {} as never
    expect(wanderburgModule.actions(state)).toEqual([])
    expect(wanderburgModule.applyAction(state, 'nope')).toBe(state)
  })

  it('validate returns empty for stub', () => {
    expect(wanderburgModule.validate({} as never)).toEqual([])
  })
})
