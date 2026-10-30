import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { modules } from '../../src/host/registry'
import { ModuleError } from '../../src/sdk/error'
import { phantomBladeZeroModule } from '../../src/games/phantom-blade-zero'
import { parse, serialize, validate } from '../../src/games/phantom-blade-zero/parse'
import { parsePbzsContainer, readSlotPayload } from '../../src/games/phantom-blade-zero/codec/container'
import {
  projectResources,
  setDust,
  setMaterialAmount
} from '../../src/games/phantom-blade-zero/model/saveModel'
import { makePbzsFixture } from './fixtures'

const encoder = new TextEncoder()

function json(document: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(document))
}

function document(dust: number, currentAmount = 3, maxAmount = 5): Record<string, unknown> {
  return {
    Player: { Dust: dust },
    Inventory: {
      InventoryInfos: {
        Weapon_Material_01: {
          CurrentAmount: currentAmount,
          MaxAmount: maxAmount,
          FirstAddTime: '2026.10.30-18.20.30',
          DirtyTime: '2026.10.30-18.20.30',
          AcquiredCycle: 0,
          UnknownField: 'preserved'
        }
      }
    },
    UnknownRoot: { preserved: true }
  }
}

async function fixture(): Promise<Uint8Array> {
  return makePbzsFixture([
    { name: '__Advanced__', compression: 0, payload: encoder.encode('opaque advanced') },
    { name: 'ManualSave2', compression: 0, payload: json(document(20)) },
    { name: 'AutoSave1', compression: 0, payload: json(document(10)) },
    { name: '__Achievements__', compression: 0, payload: encoder.encode('opaque achievements') },
    {
      name: 'FutureSlot',
      compression: 99,
      payload: encoder.encode('unknown compression stays opaque'),
      uncompressedSize: 999
    }
  ])
}

async function expectModuleError(
  action: () => unknown | Promise<unknown>,
  code: string,
  args?: Array<string | number>
): Promise<void> {
  try {
    await action()
    throw new Error('expected ModuleError')
  } catch (error) {
    expect(error).toBeInstanceOf(ModuleError)
    expect((error as ModuleError).code).toBe(code)
    if (args) expect((error as ModuleError).args).toEqual(args)
  }
}

describe('phantom-blade-zero module metadata', () => {
  it('declares the exact locator contract', () => {
    expect(phantomBladeZeroModule.locate).toEqual({
      windowsPathTemplates: [
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
        'C:\\Program Files\\Steam\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
        'D:\\SteamLibrary\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
        'E:\\SteamLibrary\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
        'F:\\SteamLibrary\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*'
      ],
      identifyAnyOf: ['PBZSaveGame.sav'],
      slotFilePatterns: ['PBZSaveGame.sav']
    })
  })

  it('publishes the catalog, inert actions, cover, and static registry entry', async () => {
    expect(phantomBladeZeroModule.id).toBe('phantom-blade-zero')
    expect(phantomBladeZeroModule.catalog).toMatchObject({
      name: { zh: '影之刃零', en: 'Phantom Blade Zero' },
      rightsHolder: 'S-GAME Studio',
      developer: 'S-GAME Studio',
      publisher: 'S-GAME Publishing',
      steamAppId: 4115450,
      storeUrl: 'https://store.steampowered.com/app/4115450/'
    })
    for (const summary of Object.values(phantomBladeZeroModule.catalog.summary!)) {
      expect(summary).toMatch(/unofficial|非官方/i)
      expect(summary).toMatch(/single-player|单机/i)
      expect(summary).toMatch(/quit|退出/i)
      expect(summary).toMatch(/Steam Cloud|Steam 云/i)
      expect(summary).toMatch(/overwrite|覆盖/i)
    }
    expect(phantomBladeZeroModule.views).toHaveLength(1)
    expect(phantomBladeZeroModule.views[0]).toMatchObject({
      id: 'resources',
      labelKey: 'pbz.tabs.resources'
    })
    const state = await parse([
      { relativePath: 'PBZSaveGame.sav', bytes: await fixture() }
    ])
    expect(phantomBladeZeroModule.actions(state)).toEqual([])
    expect(phantomBladeZeroModule.applyAction(state, 'ignored')).toBe(state)

    const coverPath = fileURLToPath(new URL('../../src/games/phantom-blade-zero/cover.jpg', import.meta.url))
    expect(readFileSync(coverPath).length).toBeGreaterThan(0)
    expect(phantomBladeZeroModule.catalog.cover.length).toBeGreaterThan(0)

    const ids = modules.map(({ id }) => id)
    expect(ids.filter((id) => id === phantomBladeZeroModule.id)).toHaveLength(1)
    expect(modules.at(-1)).toBe(phantomBladeZeroModule)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('phantom-blade-zero parse and serialize', () => {
  it('requires the exact main-save basename', async () => {
    await expectModuleError(() => parse([]), 'MISSING_FIELD', ['PBZSaveGame.sav'])
    await expectModuleError(
      () => parse([{ relativePath: 'pbzsavegame.sav', bytes: new Uint8Array() }]),
      'MISSING_FIELD',
      ['PBZSaveGame.sav']
    )
  })

  it('preserves container/authentication errors instead of wrapping them', async () => {
    await expectModuleError(
      () => parse([{ relativePath: 'PBZSaveGame.sav', bytes: encoder.encode('garbage') }]),
      'PBZ_INVALID_CONTAINER'
    )
    const corrupt = await fixture()
    corrupt[20] = corrupt[20]! ^ 0xff
    await expectModuleError(
      () => parse([{ relativePath: 'PBZSaveGame.sav', bytes: corrupt }]),
      'PBZ_AUTH_FAILED'
    )
  })

  it('parses only editable slots and selects the first editable directory entry', async () => {
    const state = await parse([
      { relativePath: 'nested/PBZSaveGame.sav', bytes: await fixture() }
    ])
    expect(state.relativePath).toBe('nested/PBZSaveGame.sav')
    expect(state.model.slots.map(({ name }) => name)).toEqual(['ManualSave2', 'AutoSave1'])
    expect(state.model.selectedSlotName).toBe('ManualSave2')
    expect(state.container.slots.map(({ entry }) => entry.name)).toEqual([
      '__Advanced__',
      'ManualSave2',
      'AutoSave1',
      '__Achievements__',
      'FutureSlot'
    ])
  })

  it('rejects containers without an editable slot without opening opaque slots', async () => {
    const bytes = await makePbzsFixture([
      { name: '__Advanced__', compression: 0, payload: encoder.encode('opaque') },
      {
        name: 'FutureSlot',
        compression: 99,
        payload: encoder.encode('opaque'),
        uncompressedSize: 123
      }
    ])
    await expectModuleError(
      () => parse([{ relativePath: 'PBZSaveGame.sav', bytes }]),
      'PBZ_NO_EDITABLE_SLOTS'
    )
  })

  it('returns a stable validation snapshot and blocks invalid serialization', async () => {
    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes: await fixture() }])
    ;(state.model.slots[0]!.document.Player as Record<string, unknown>).Dust = -1
    const first = validate(state)
    expect(first[0]?.code).toBe('PBZ_INVALID_DUST')
    first.length = 0
    expect(validate(state)[0]?.code).toBe('PBZ_INVALID_DUST')
    await expectModuleError(() => serialize(state), 'PBZ_INVALID_EDIT', ['PBZ_INVALID_DUST'])
  })

  it('round-trips an unmodified save and preserves every sealed slot block', async () => {
    const input = await fixture()
    const before = await parsePbzsContainer(input)
    const state = await parse([{ relativePath: 'folder/PBZSaveGame.sav', bytes: input }])
    const output = await serialize(state)

    expect(output).toHaveLength(1)
    expect(output[0]!.relativePath).toBe('folder/PBZSaveGame.sav')
    const after = await parsePbzsContainer(output[0]!.bytes)
    expect(after.slots.map(({ sealedBytes }) => sealedBytes)).toEqual(
      before.slots.map(({ sealedBytes }) => sealedBytes)
    )
    for (const name of ['ManualSave2', 'AutoSave1']) {
      expect(await readSlotPayload(after, name)).toEqual(await readSlotPayload(before, name))
    }
  })

  it('persists a Dust edit while preserving all other sealed slot blocks', async () => {
    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes: await fixture() }])
    const untouched = new Map(
      state.container.slots
        .filter(({ entry }) => entry.name !== 'ManualSave2')
        .map(({ entry, sealedBytes }) => [entry.name, sealedBytes])
    )
    setDust(state.model, 'ManualSave2', 777)
    const [output] = await serialize(state)
    const reparsed = await parse([output!])

    expect(projectResources(reparsed.model.slots[0]!).dust).toBe(777)
    for (const slot of reparsed.container.slots) {
      const expected = untouched.get(slot.entry.name)
      if (expected) expect(slot.sealedBytes).toEqual(expected)
    }
  })

  it('keeps material CurrentAmount/MaxAmount rules through the complete module chain', async () => {
    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes: await fixture() }])
    setMaterialAmount(state.model, 'AutoSave1', 'Weapon_Material_01', 12)
    const [output] = await serialize(state)
    const reparsed = await parse([output!])
    const auto = reparsed.model.slots.find(({ name }) => name === 'AutoSave1')!

    expect(projectResources(auto).materials).toEqual([
      { id: 'Weapon_Material_01', currentAmount: 12, maxAmount: 12 }
    ])
    expect(
      (
        (
          auto.document.Inventory as Record<string, unknown>
        ).InventoryInfos as Record<string, Record<string, unknown>>
      ).Weapon_Material_01!.UnknownField
    ).toBe('preserved')
  })
})
