import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { modules } from '@host/registry'
import { chaosFrontModule } from '../../src/games/chaos-front'
import { chaosGalaxy2Module } from '../../src/games/chaos-galaxy-2'
import { wanderburgModule } from '../../src/games/wanderburg'
import { encryptUtf8ToSaveBytes } from '../../src/games/wanderburg/crypto/mmJsonEncrypted'
import { MM_KEY } from '../../src/games/wanderburg/crypto/keys'

describe('wanderburgModule catalog / locate / registry', () => {
  it('registers as wanderburg with catalog, locate, resources and unlock views', () => {
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
    expect(modules.map((m) => m.id)).toEqual([
      'chaos-front',
      'chaos-galaxy-2',
      'wanderburg',
      'terraria',
      'dragon-sword',
      'eslabong'
    ])
    expect(modules[0]).toBe(chaosFrontModule)
    expect(modules[1]).toBe(chaosGalaxy2Module)
    expect(modules[2]).toBe(wanderburgModule)
  })
})

describe('wanderburgModule parse / serialize', () => {
  const relativePath = 'Saves/Playtest/Generation_0001/SaveData.json'
  const doc = { saveVersion: 7, silver: 100, unlockedIDs: [1, 2] }
  const bytes = encryptUtf8ToSaveBytes(JSON.stringify(doc), MM_KEY)

  it('parse decrypts SaveData.json into state', () => {
    const state = wanderburgModule.parse([{ relativePath, bytes }])
    expect(state.relativePath).toBe(relativePath)
    expect(state.doc).toEqual(doc)
  })

  it('parse throws MISSING_FIELD without SaveData.json', () => {
    expect(() =>
      wanderburgModule.parse([{ relativePath: 'Saves/other.txt', bytes: new Uint8Array([1]) }])
    ).toThrow(ModuleError)
    try {
      wanderburgModule.parse([{ relativePath: 'Saves/other.txt', bytes: new Uint8Array([1]) }])
    } catch (e) {
      expect(e).toMatchObject({ code: 'MISSING_FIELD', args: ['SaveData.json'] })
    }
  })

  it('parse throws DECRYPT_FAILED on garbage bytes', () => {
    expect(() =>
      wanderburgModule.parse([{ relativePath, bytes: new Uint8Array([1, 2, 3]) }])
    ).toThrow(ModuleError)
    try {
      wanderburgModule.parse([{ relativePath, bytes: new Uint8Array([1, 2, 3]) }])
    } catch (e) {
      expect(e).toMatchObject({ code: 'DECRYPT_FAILED', args: [] })
    }
  })

  it('serialize round-trips through parse and also writes game-side backup', () => {
    const state = wanderburgModule.parse([{ relativePath, bytes }])
    const out = wanderburgModule.serialize(state)
    expect(out.map((f) => f.relativePath)).toEqual([
      relativePath,
      'Saves/Playtest/Generation_0001/SaveData.backup.json'
    ])
    expect(out[0]?.bytes.length).toBeGreaterThan(0)
    expect(out[1]?.bytes).toEqual(out[0]?.bytes)
    const again = wanderburgModule.parse([out[0]!])
    expect(again.doc).toEqual(doc)
  })

  it('actions is empty and applyAction is identity', () => {
    const state = wanderburgModule.parse([{ relativePath, bytes }])
    expect(wanderburgModule.actions(state)).toEqual([])
    expect(wanderburgModule.applyAction(state, 'nope')).toBe(state)
  })

  it('validate returns empty', () => {
    const state = wanderburgModule.parse([{ relativePath, bytes }])
    expect(wanderburgModule.validate(state)).toEqual([])
  })
})
