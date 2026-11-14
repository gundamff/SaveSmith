import { describe, expect, it } from 'vitest'
import { ModuleError } from '../../src/sdk/error'
import {
  parsePbzsContainer,
  readSlotPayload
} from '../../src/games/phantom-blade-zero/codec/container'
import {
  isNightmareRunSlotName,
  isNightmareSnapshotSlotName
} from '../../src/games/phantom-blade-zero/model/nightmareRunSlots'
import { deleteNightmareRunSlots } from '../../src/games/phantom-blade-zero/model/deleteNightmareRuns'
import { parse, serialize } from '../../src/games/phantom-blade-zero/parse'
import { projectResources } from '../../src/games/phantom-blade-zero/model/saveModel'
import { makePbzsFixture } from './fixtures'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function json(document: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(document))
}

function runDoc(
  dust: number,
  lineageId?: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    Player: { Dust: dust },
    Inventory: { InventoryInfos: {} }
  }
  if (lineageId !== undefined) {
    doc.PBZGameSystem = { NightmareLineageId: lineageId, CycleCount: 0 }
  }
  return doc
}

function advancedDoc(lastContinueSlot: string): Record<string, unknown> {
  return {
    LastContinueSlot: lastContinueSlot,
    Codex: { DiscoveredEnemies: [], RevealedEnemies: [] },
    KeepMe: true
  }
}

describe('nightmare run slot name helpers', () => {
  it('recognizes NightmareRun with or without digits', () => {
    expect(isNightmareRunSlotName('NightmareRun0')).toBe(true)
    expect(isNightmareRunSlotName('NightmareRun12')).toBe(true)
    expect(isNightmareRunSlotName('NightmareRun')).toBe(true)
    expect(isNightmareRunSlotName('AutoSave0')).toBe(false)
    expect(isNightmareRunSlotName('NightmareCycleStart_abc')).toBe(false)
  })

  it('recognizes bare and lineage-suffixed snapshot slots', () => {
    expect(isNightmareSnapshotSlotName('NightmareCycleStart')).toBe(true)
    expect(isNightmareSnapshotSlotName('NightmareLineStart')).toBe(true)
    expect(isNightmareSnapshotSlotName('NightmareCycleStart_line-1')).toBe(true)
    expect(isNightmareSnapshotSlotName('NightmareLineStart_line-1')).toBe(true)
    expect(isNightmareSnapshotSlotName('NightmareRun0')).toBe(false)
    expect(isNightmareSnapshotSlotName('EndingReturn_x')).toBe(false)
  })
})

describe('deleteNightmareRunSlots', () => {
  it('removes NightmareRun slots, keeps Auto/Manual, cleans paired snapshots, fixes LastContinueSlot', async () => {
    const bytes = await makePbzsFixture([
      {
        name: '__Advanced__',
        compression: 0,
        payload: json(advancedDoc('NightmareRun1'))
      },
      { name: 'AutoSave0', compression: 0, payload: json(runDoc(10)) },
      { name: 'ManualSave4', compression: 0, payload: json(runDoc(40)) },
      {
        name: 'NightmareRun0',
        compression: 0,
        payload: json(runDoc(100, 'line-a'))
      },
      {
        name: 'NightmareRun1',
        compression: 0,
        payload: json(runDoc(101, 'line-b'))
      },
      {
        name: 'NightmareCycleStart_line-a',
        compression: 0,
        payload: json({ snap: 'a-cycle' })
      },
      {
        name: 'NightmareLineStart_line-a',
        compression: 0,
        payload: json({ snap: 'a-line' })
      },
      {
        name: 'NightmareCycleStart_line-b',
        compression: 0,
        payload: json({ snap: 'b-cycle' })
      },
      {
        name: 'NightmareLineStart_line-b',
        compression: 0,
        payload: json({ snap: 'b-line' })
      },
      {
        name: '__Achievements__',
        compression: 0,
        payload: encoder.encode('opaque-achievements')
      },
      {
        name: 'EndingReturn_keep',
        compression: 0,
        payload: json({ keep: true })
      }
    ])

    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes }])
    const result = await deleteNightmareRunSlots(state)
    expect(result.deletedRunNames).toEqual(['NightmareRun0', 'NightmareRun1'])
    expect(result.deletedSnapshotNames.sort()).toEqual(
      [
        'NightmareCycleStart_line-a',
        'NightmareCycleStart_line-b',
        'NightmareLineStart_line-a',
        'NightmareLineStart_line-b'
      ].sort()
    )
    expect(result.continueSlotBefore).toBe('NightmareRun1')
    expect(result.continueSlotAfter).toBe('ManualSave4')

    expect(state.container.slots.map(({ entry }) => entry.name)).toEqual([
      '__Advanced__',
      'AutoSave0',
      'ManualSave4',
      '__Achievements__',
      'EndingReturn_keep'
    ])
    expect(state.model.slots.map(({ name }) => name)).toEqual([
      'AutoSave0',
      'ManualSave4'
    ])
    expect(state.model.advanced?.dirty).toBe(true)
    expect(state.model.advanced?.document.LastContinueSlot).toBe('ManualSave4')
    expect(state.model.advanced?.document.KeepMe).toBe(true)

    const [output] = await serialize(state)
    const reparsed = await parse([output!])
    expect(reparsed.container.slots.map(({ entry }) => entry.name)).toEqual([
      '__Advanced__',
      'AutoSave0',
      'ManualSave4',
      '__Achievements__',
      'EndingReturn_keep'
    ])
    expect(projectResources(reparsed.model.slots[0]!).dust).toBe(10)
    expect(projectResources(reparsed.model.slots[1]!).dust).toBe(40)
    const advancedPayload = await readSlotPayload(
      reparsed.container,
      '__Advanced__'
    )
    expect(JSON.parse(decoder.decode(advancedPayload))).toMatchObject({
      LastContinueSlot: 'ManualSave4',
      KeepMe: true
    })
    expect(await readSlotPayload(reparsed.container, 'EndingReturn_keep')).toEqual(
      json({ keep: true })
    )
  })

  it('removes bare NightmareRun and unsuffixed snapshot slots', async () => {
    const bytes = await makePbzsFixture([
      {
        name: '__Advanced__',
        compression: 0,
        payload: json(advancedDoc('NightmareRun'))
      },
      { name: 'AutoSave0', compression: 0, payload: json(runDoc(1)) },
      {
        name: 'NightmareRun0',
        compression: 0,
        payload: json(runDoc(8, 'unused'))
      },
      {
        name: 'NightmareCycleStart',
        compression: 0,
        payload: json({ bare: 'cycle' })
      },
      {
        name: 'NightmareLineStart',
        compression: 0,
        payload: json({ bare: 'line' })
      }
    ])

    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes }])
    // Bare "NightmareRun" is not editable, but still lives in the container directory.
    const bareFixture = await makePbzsFixture([
      { name: 'NightmareRun', compression: 0, payload: json(runDoc(9)) }
    ])
    const bareContainer = await parsePbzsContainer(bareFixture)
    state.container.slots.push(bareContainer.slots[0]!)

    const result = await deleteNightmareRunSlots(state)
    expect(result.deletedRunNames.sort()).toEqual(
      ['NightmareRun', 'NightmareRun0'].sort()
    )
    expect(result.deletedSnapshotNames.sort()).toEqual(
      ['NightmareCycleStart', 'NightmareLineStart'].sort()
    )
    expect(
      state.container.slots.some(
        ({ entry }) =>
          isNightmareRunSlotName(entry.name) ||
          isNightmareSnapshotSlotName(entry.name)
      )
    ).toBe(false)
    expect(result.continueSlotAfter).toBe('AutoSave0')
  })

  it('can delete a subset of NightmareRun slots and only their lineage snapshots', async () => {
    const bytes = await makePbzsFixture([
      {
        name: '__Advanced__',
        compression: 0,
        payload: json(advancedDoc('AutoSave0'))
      },
      { name: 'AutoSave0', compression: 0, payload: json(runDoc(1)) },
      {
        name: 'NightmareRun0',
        compression: 0,
        payload: json(runDoc(10, 'keep-line'))
      },
      {
        name: 'NightmareRun1',
        compression: 0,
        payload: json(runDoc(11, 'drop-line'))
      },
      {
        name: 'NightmareCycleStart_keep-line',
        compression: 0,
        payload: json({ keep: true })
      },
      {
        name: 'NightmareLineStart_keep-line',
        compression: 0,
        payload: json({ keep: true })
      },
      {
        name: 'NightmareCycleStart_drop-line',
        compression: 0,
        payload: json({ drop: true })
      },
      {
        name: 'NightmareLineStart_drop-line',
        compression: 0,
        payload: json({ drop: true })
      }
    ])

    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes }])
    const result = await deleteNightmareRunSlots(state, {
      names: ['NightmareRun1']
    })
    expect(result.deletedRunNames).toEqual(['NightmareRun1'])
    expect(result.deletedSnapshotNames.sort()).toEqual(
      ['NightmareCycleStart_drop-line', 'NightmareLineStart_drop-line'].sort()
    )
    expect(state.container.slots.map(({ entry }) => entry.name)).toEqual([
      '__Advanced__',
      'AutoSave0',
      'NightmareRun0',
      'NightmareCycleStart_keep-line',
      'NightmareLineStart_keep-line'
    ])
    expect(result.continueSlotBefore).toBeNull()
    expect(result.continueSlotAfter).toBeNull()
  })

  it('prefers ManualSave over AutoSave when rewriting LastContinueSlot', async () => {
    const bytes = await makePbzsFixture([
      {
        name: '__Advanced__',
        compression: 0,
        payload: json(advancedDoc('NightmareRun0'))
      },
      { name: 'AutoSave2', compression: 0, payload: json(runDoc(2)) },
      { name: 'AutoSave0', compression: 0, payload: json(runDoc(0)) },
      { name: 'ManualSave1', compression: 0, payload: json(runDoc(1)) },
      {
        name: 'NightmareRun0',
        compression: 0,
        payload: json(runDoc(9, 'x'))
      }
    ])
    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes }])
    const result = await deleteNightmareRunSlots(state)
    expect(result.continueSlotAfter).toBe('ManualSave1')
  })

  it('refuses when deletion would empty the container', async () => {
    const bytes = await makePbzsFixture([
      {
        name: 'NightmareRun0',
        compression: 0,
        payload: json(runDoc(1, 'only'))
      }
    ])
    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes }])
    await expect(deleteNightmareRunSlots(state)).rejects.toBeInstanceOf(ModuleError)
    await expect(deleteNightmareRunSlots(state)).rejects.toMatchObject({
      code: 'PBZ_EMPTY_CONTAINER'
    })
  })

  it('is a no-op when there are no NightmareRun slots', async () => {
    const bytes = await makePbzsFixture([
      {
        name: '__Advanced__',
        compression: 0,
        payload: json(advancedDoc('AutoSave0'))
      },
      { name: 'AutoSave0', compression: 0, payload: json(runDoc(1)) }
    ])
    const state = await parse([{ relativePath: 'PBZSaveGame.sav', bytes }])
    const before = state.container.slots.map(({ entry }) => entry.name)
    const result = await deleteNightmareRunSlots(state)
    expect(result.deletedRunNames).toEqual([])
    expect(result.deletedSnapshotNames).toEqual([])
    expect(state.container.slots.map(({ entry }) => entry.name)).toEqual(before)
  })
})
