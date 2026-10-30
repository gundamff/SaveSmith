import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { parse, serialize, validate, type PhantomBladeZeroState } from '../../src/games/phantom-blade-zero/parse'
import { parsePbzsContainer } from '../../src/games/phantom-blade-zero/codec/container'
import {
  projectResources,
  setDust,
  setMaterialAmount
} from '../../src/games/phantom-blade-zero/model/saveModel'

const SAVE = process.env.PBZ_SAVE
const MAX_DUST = 99_999_999
const MAX_MATERIAL_AMOUNT = 9999

describe.skipIf(!SAVE)('phantom-blade-zero real save (PBZ_SAVE)', () => {
  let originalBytes: Uint8Array

  beforeAll(() => {
    originalBytes = readFileSync(SAVE!)
  })

  async function parseOriginal(): Promise<PhantomBladeZeroState> {
    return parse([{ relativePath: 'PBZSaveGame.sav', bytes: originalBytes }])
  }

  function applyMinimalIncrement(state: PhantomBladeZeroState):
    | { slotName: string; kind: 'dust'; expected: number }
    | { slotName: string; kind: 'material'; id: string; expected: number }
    | null {
    for (const slot of state.model.slots) {
      const resources = projectResources(slot)
      if (resources.dust < MAX_DUST) {
        const expected = resources.dust + 1
        setDust(state.model, slot.name, expected)
        return { slotName: slot.name, kind: 'dust', expected }
      }
      const material = resources.materials.find(
        ({ currentAmount }) => currentAmount < MAX_MATERIAL_AMOUNT
      )
      if (material) {
        const expected = material.currentAmount + 1
        setMaterialAmount(state.model, slot.name, material.id, expected)
        return { slotName: slot.name, kind: 'material', id: material.id, expected }
      }
    }
    return null
  }

  it('parses editable slots and projects valid Dust and existing materials', async () => {
    const state = await parseOriginal()

    expect(state.model.slots.length).toBeGreaterThan(0)
    expect(state.model.slots.every(({ name }) => /^(?:AutoSave|ManualSave)\d+$/.test(name))).toBe(true)
    for (const slot of state.model.slots) {
      const resources = projectResources(slot)
      expect(Number.isSafeInteger(resources.dust)).toBe(true)
      expect(resources.dust).toBeGreaterThanOrEqual(0)
      expect(resources.dust).toBeLessThanOrEqual(MAX_DUST)
      for (const material of resources.materials) {
        expect(material.id).toMatch(/^Weapon_Material_/)
        expect(material.currentAmount).toBeGreaterThanOrEqual(0)
        expect(material.currentAmount).toBeLessThanOrEqual(MAX_MATERIAL_AMOUNT)
        expect(material.maxAmount).toBeGreaterThanOrEqual(material.currentAmount)
      }
    }
    expect(validate(state)).toEqual([])
  })

  it('cleanly round-trips while preserving every sealed slot block', async () => {
    const before = await parseOriginal()
    const [serialized] = await serialize(before)
    const reparsed = await parse([serialized!])

    expect(validate(reparsed)).toEqual([])
    for (const [index, slot] of reparsed.container.slots.entries()) {
      expect(Buffer.compare(slot.sealedBytes, before.container.slots[index]!.sealedBytes)).toBe(0)
    }
  })

  it('persists one safe in-memory resource increment', async (context) => {
    const state = await parseOriginal()
    const edit = applyMinimalIncrement(state)
    if (!edit) {
      context.skip('all editable Dust and material values are already at their limits')
      return
    }

    expect(validate(state)).toEqual([])
    const [serialized] = await serialize(state)
    const reparsed = await parse([serialized!])
    const editedSlot = reparsed.model.slots.find(({ name }) => name === edit.slotName)!
    const resources = projectResources(editedSlot)

    expect(validate(reparsed)).toEqual([])
    if (edit.kind === 'dust') {
      expect(resources.dust).toBe(edit.expected)
    } else {
      expect(resources.materials.find(({ id }) => id === edit.id)?.currentAmount).toBe(edit.expected)
    }
  })

  it('preserves every other sealed slot block after one in-memory edit', async (context) => {
    const state = await parseOriginal()
    const edit = applyMinimalIncrement(state)
    if (!edit) {
      context.skip('all editable Dust and material values are already at their limits')
      return
    }
    const untouched = new Map(
      state.container.slots
        .filter(({ entry }) => entry.name !== edit.slotName)
        .map(({ entry, sealedBytes }) => [entry.name, sealedBytes])
    )

    const [serialized] = await serialize(state)
    const after = await parsePbzsContainer(serialized!.bytes)

    for (const slot of after.slots) {
      const expected = untouched.get(slot.entry.name)
      if (expected) expect(Buffer.compare(slot.sealedBytes, expected)).toBe(0)
    }
  })
})
