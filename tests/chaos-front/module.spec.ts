import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { utf8Decode, utf8Encode } from '@sdk/session'
import type { ListedFile, SlotBytes } from '@sdk/types'
import { modules } from '@host/registry'
import { chaosFrontModule } from '../../src/games/chaos-front'
import { wanderburgModule } from '../../src/games/wanderburg'
import { SaveData } from '../../src/games/chaos-front/model/saveModel'

const fixture = (): string => readFileSync(join(__dirname, 'fixtures/minimal-save.json'), 'utf8')

const campaignBytes = (text = fixture()): SlotBytes => ({
  relativePath: 'savedata0.cf',
  bytes: utf8Encode(text)
})

function listed(files: ListedFile[]) {
  return { dir: 'D:\\saves', files }
}

describe('chaosFrontModule catalog / locate', () => {
  it('registers as chaos-front with locked catalog and locate fields', () => {
    expect(chaosFrontModule.id).toBe('chaos-front')
    expect(chaosFrontModule.views.map((v) => v.id)).toEqual([
      'resources',
      'planets',
      'formation',
      'units',
      'pilots',
      'unlock',
      'collection'
    ])
    expect(chaosFrontModule.views.map((v) => v.labelKey)).toEqual([
      'cf.tabs.resources',
      'cf.tabs.planets',
      'cf.tabs.formation',
      'cf.tabs.units',
      'cf.tabs.pilots',
      'cf.tabs.unlock',
      'cf.tabs.collection'
    ])
    expect(chaosFrontModule.views.every((v) => v.component != null)).toBe(true)
    expect(chaosFrontModule.catalog).toMatchObject({
      name: { zh: '混沌兵团', en: 'Chaos Front' },
      rightsHolder: 'ChaosGalaxyStudio',
      developer: 'Han Zhiyu',
      publisher: 'ChaosGalaxyStudio',
      steamAppId: 2770330,
      summary: {
        zh: '非官方存档修改器。请先退出游戏再改档。',
        en: 'Unofficial save editor. Quit the game before editing.'
      }
    })
    expect(chaosFrontModule.catalog.cover.length).toBeGreaterThan(0)
    expect(chaosFrontModule.locate).toEqual({
      windowsPathTemplates: [
        '%USERPROFILE%\\AppData\\LocalLow\\ChaosGalaxyStudio\\Chaos Front'
      ],
      identifyAnyOf: [
        'savedata0.cf',
        'savedata1.cf',
        'savedata2.cf',
        'savedata3.cf',
        'savedata4.cf',
        'savedata5.cf',
        'collection.cf'
      ]
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
    expect(modules[2]).toBe(wanderburgModule)
  })
})

describe('listSlots', () => {
  it('lists slots 0..5; missing files are empty; readable slots include collection.cf', () => {
    const slots = chaosFrontModule.listSlots(
      listed([
        { relativePath: 'savedata0.cf', bytes: utf8Encode(fixture()) },
        { relativePath: 'savedata2.cf', bytes: null }
      ])
    )
    expect(slots).toHaveLength(6)
    expect(slots.map((s) => s.id)).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(slots[0]).toMatchObject({
      exists: true,
      readable: true,
      title: '焰火团',
      subtitle: '2026/9/7 15:52:02',
      sessionFiles: ['savedata0.cf', 'collection.cf']
    })
    expect(slots[1]).toMatchObject({ exists: false, readable: false, sessionFiles: [] })
    expect(slots[2]).toMatchObject({ exists: true, readable: false, sessionFiles: [] })
  })

  it('marks a slot unreadable when summarize cannot parse the header', () => {
    const slots = chaosFrontModule.listSlots(
      listed([{ relativePath: 'savedata1.cf', bytes: utf8Encode('not-json') }])
    )
    expect(slots[1]).toMatchObject({ exists: true, readable: false, sessionFiles: [] })
  })
})

describe('parse / actions / validate / serialize', () => {
  it('parse → applyAction max-units → validate [] → serialize includes savedata0.cf', () => {
    const state = chaosFrontModule.parse([campaignBytes()])
    expect(state.slot).toBe(0)
    expect(state.collection).toBeNull()
    expect(state.campaign).toBeInstanceOf(SaveData)

    const before = state.campaign.units.map((u) => u.exp)
    const next = chaosFrontModule.applyAction(state, 'max-units')
    expect(next).toBe(state)
    expect(state.campaign.units.map((u) => u.exp)).not.toEqual(before)

    expect(chaosFrontModule.validate(state)).toEqual([])

    const out = chaosFrontModule.serialize(state)
    expect(out.map((f) => f.relativePath)).toEqual(['savedata0.cf'])
    expect(out[0].bytes.length).toBeGreaterThan(0)
    const round = SaveData.load(utf8Decode(out[0].bytes))
    expect(round.units[0].exp).toBe(state.campaign.units[0].exp)
  })

  it('disables max-collection when collection.cf is missing', () => {
    const state = chaosFrontModule.parse([campaignBytes()])
    const specs = chaosFrontModule.actions(state)
    expect(specs.map((a) => a.id)).toEqual([
      'fill-resources',
      'max-units',
      'max-pilots',
      'unlock-all',
      'max-collection'
    ])
    expect(specs.every((a) => a.kind === 'button')).toBe(true)
    expect(specs.find((a) => a.id === 'max-collection')?.disabled).toBe(true)
    expect(specs.find((a) => a.id === 'fill-resources')?.labelKey).toBe('cf.actions.fillResources')
    expect(specs.find((a) => a.id === 'max-units')?.labelKey).toBe('cf.actions.maxUnits')
    expect(specs.find((a) => a.id === 'max-pilots')?.labelKey).toBe('cf.actions.maxPilots')
    expect(specs.find((a) => a.id === 'unlock-all')?.labelKey).toBe('cf.actions.unlockAll')
    expect(specs.find((a) => a.id === 'max-collection')?.labelKey).toBe('cf.actions.maxCollection')
  })

  it('validate reports DEPLOYED_NO_PILOT without throwing', () => {
    const raw = JSON.parse(fixture()) as {
      PlayerUnits: { value: Array<{ number: number[]; characterId: number }> }
    }
    raw.PlayerUnits.value[0].number = [1, 0]
    raw.PlayerUnits.value[0].characterId = 0
    const state = chaosFrontModule.parse([campaignBytes(JSON.stringify(raw))])
    const issues = chaosFrontModule.validate(state)
    expect(issues.some((i) => i.code === 'DEPLOYED_NO_PILOT')).toBe(true)
    expect(issues[0]?.args.length).toBeGreaterThan(0)
  })

  it('fill-resources writes the ResourcesTab maxAll caps in place', () => {
    const state = chaosFrontModule.parse([campaignBytes()])
    chaosFrontModule.applyAction(state, 'fill-resources')
    expect(state.campaign.credit).toBe(99_999_999)
    expect(state.campaign.prestige).toBe(99_999)
    expect(state.campaign.star).toBe(6)
  })

  it('parses optional collection; bad collection.cf becomes null', () => {
    const collectionText = JSON.stringify({
      Endings: { __type: 'System.Boolean[],mscorlib', value: [false, false] },
      Units: { __type: 'System.Int32[],mscorlib', value: [0, 0] },
      Members: { __type: 'System.Int32[],mscorlib', value: [0, 0] }
    })
    const withCol = chaosFrontModule.parse([
      campaignBytes(),
      { relativePath: 'collection.cf', bytes: utf8Encode(collectionText) }
    ])
    expect(withCol.collection).not.toBeNull()
    expect(chaosFrontModule.actions(withCol).find((a) => a.id === 'max-collection')?.disabled).toBeFalsy()
    const same = chaosFrontModule.applyAction(withCol, 'max-collection')
    expect(same).toBe(withCol)
    expect(withCol.collection?.endings.every(Boolean)).toBe(true)
    expect(chaosFrontModule.serialize(withCol).map((f) => f.relativePath)).toEqual([
      'savedata0.cf',
      'collection.cf'
    ])

    const bad = chaosFrontModule.parse([
      campaignBytes(),
      { relativePath: 'collection.cf', bytes: utf8Encode('nope') }
    ])
    expect(bad.collection).toBeNull()
  })

  it('throws UNKNOWN_ACTION for an unknown id', () => {
    const state = chaosFrontModule.parse([campaignBytes()])
    expect(() => chaosFrontModule.applyAction(state, 'nope')).toThrow(ModuleError)
    try {
      chaosFrontModule.applyAction(state, 'nope')
    } catch (e) {
      expect(e).toMatchObject({ code: 'UNKNOWN_ACTION', args: ['nope'] })
    }
  })
})
