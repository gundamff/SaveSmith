import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { modules } from '@host/registry'
import { deadCellsModule } from '../../src/games/dead-cells'
import {
  buildContainer,
  getChunk,
  parseContainer,
  type DcContainer
} from '../../src/games/dead-cells/model/container'
import { decodeHxs, encodeHxs } from '../../src/games/dead-cells/model/hxbit'
import {
  projectUser,
  setDeathCells,
  setDeathMoney
} from '../../src/games/dead-cells/model/userModel'
import { parse, serialize, validate } from '../../src/games/dead-cells/parse'
import { buildUserChunk } from './fixtures'

function containerOf(userChunk: Uint8Array): DcContainer {
  return {
    header: {
      magic: new Uint8Array([0xde, 0xad, 0xce, 0x11]),
      version: 1,
      sha1: new Uint8Array(20),
      githash: new Uint8Array(20),
      buildDate: new TextEncoder().encode('2026-06-16'),
      flags: 0
    },
    chunks: [{ bit: 0x001, name: 'S_User', data: userChunk }]
  }
}

async function makeContainerBytes(chunk?: Uint8Array): Promise<Uint8Array> {
  return buildContainer(containerOf(chunk ?? buildUserChunk()))
}

describe('deadCellsModule catalog / locate / registry', () => {
  it('registers as dead-cells with catalog, locate and three views', () => {
    expect(deadCellsModule.id).toBe('dead-cells')
    expect(deadCellsModule.views.map((v) => v.id)).toEqual([
      'resources',
      'blueprints',
      'unlock',
      'runes'
    ])
    expect(deadCellsModule.views.map((v) => v.labelKey)).toEqual([
      'dc.tabs.resources',
      'dc.tabs.blueprints',
      'dc.tabs.unlock',
      'dc.tabs.runes'
    ])
    expect(deadCellsModule.views.every((v) => v.component != null)).toBe(true)
    expect(deadCellsModule.catalog).toMatchObject({
      name: { zh: '死亡细胞', en: 'Dead Cells' },
      rightsHolder: 'Motion Twin / Evil Empire',
      steamAppId: 588650
    })
    expect(deadCellsModule.catalog.cover.length).toBeGreaterThan(0)
    expect(deadCellsModule.locate).toEqual({
      windowsPathTemplates: [
        'C:\\Program Files (x86)\\Steam\\userdata\\*\\588650\\remote',
        'C:\\Program Files\\Steam\\userdata\\*\\588650\\remote',
        'D:\\Steam\\userdata\\*\\588650\\remote',
        'E:\\Steam\\userdata\\*\\588650\\remote',
        'F:\\Steam\\userdata\\*\\588650\\remote',
        'D:\\SteamLibrary\\userdata\\*\\588650\\remote',
        'E:\\SteamLibrary\\userdata\\*\\588650\\remote',
        'F:\\SteamLibrary\\userdata\\*\\588650\\remote',
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dead Cells\\save',
        'C:\\Program Files\\Steam\\steamapps\\common\\Dead Cells\\save',
        'D:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
        'E:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
        'F:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save'
      ],
      identifyAnyOf: ['user_0.dat', 'user_1.dat', 'user_2.dat'],
      slotFilePatterns: ['user_*.dat']
    })
    expect(modules.map((m) => m.id)).toContain('dead-cells')
    expect(modules[2]).toBe(deadCellsModule)
  })
})

describe('deadCellsModule parse / serialize', () => {
  const relativePath = 'user_0.dat'

  it('parse extracts state from user_0.dat', async () => {
    const bytes = await makeContainerBytes()
    const state = await parse([{ relativePath, bytes }])
    expect(state.relativePath).toBe(relativePath)
    expect(state.doc.root?.className).toBe('User')
    expect(projectUser(state.doc).deathMoney).toBe(100)
  })

  it('parse throws MISSING_FIELD without user_*.dat', async () => {
    await expect(parse([{ relativePath: 'other.bin', bytes: new Uint8Array([1]) }])).rejects.toThrow(
      ModuleError
    )
  })

  it('parse throws PARSE_FAILED on garbage bytes', async () => {
    try {
      await parse([{ relativePath, bytes: new Uint8Array([1, 2, 3, 4, 5, 6]) }])
      expect.unreachable()
    } catch (e) {
      expect(e).toMatchObject({ code: 'PARSE_FAILED' })
    }
  })

  it('serialize round-trips through parse', async () => {
    const bytes = await makeContainerBytes()
    const state = await parse([{ relativePath, bytes }])
    const out = await serialize(state)
    expect(out).toHaveLength(1)
    expect(out[0]!.relativePath).toBe(relativePath)
    const again = await parse([{ relativePath, bytes: out[0]!.bytes }])
    expect(projectUser(again.doc).deathMoney).toBe(100)
  })

  it('serialize reflects edits', async () => {
    const bytes = await makeContainerBytes()
    const state = await parse([{ relativePath, bytes }])
    setDeathMoney(state.doc, 4242)
    const out = await serialize(state)
    const again = await parse([{ relativePath, bytes: out[0]!.bytes }])
    expect(projectUser(again.doc).deathMoney).toBe(4242)
  })

  it('validate reports negative amounts and passes clean state', async () => {
    const bytes = await makeContainerBytes()
    const state = await parse([{ relativePath, bytes }])
    expect(validate(state)).toEqual([])
    setDeathCells(state.doc, -5)
    const issues = validate(state)
    expect(issues).toHaveLength(1)
    expect(issues[0]!.code).toBe('INVALID_AMOUNT')
  })

  it('validate tolerates negative item sentinels used by real saves', async () => {
    const chunk = buildUserChunk({
      items: [{ itemId: 'StandardTurret', investedCells: -2, isNew: false, unlocked: true }]
    })
    const bytes = await makeContainerBytes(chunk)
    const state = await parse([{ relativePath, bytes }])
    expect(validate(state)).toEqual([])
  })

  it('actions is empty and applyAction is identity', async () => {
    const bytes = await makeContainerBytes()
    const state = await parse([{ relativePath, bytes }])
    expect(deadCellsModule.actions(state)).toEqual([])
    expect(deadCellsModule.applyAction(state, 'nope')).toBe(state)
  })

  it('unmodified S_User chunk survives parse->serialize byte-identical', async () => {
    const chunk = buildUserChunk()
    const bytes = await buildContainer(containerOf(chunk))
    const state = await parse([{ relativePath, bytes }])
    const out = await serialize(state)
    const container = await parseContainer(out[0]!.bytes)
    expect(getChunk(container, 'S_User')!.data).toEqual(chunk)
    const doc = decodeHxs(chunk, 'User')
    expect(encodeHxs(doc)).toEqual(chunk)
  })
})
