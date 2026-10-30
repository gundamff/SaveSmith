import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { pbzCatalog, type PbzItemCategory } from '../../src/games/phantom-blade-zero/catalog'
import { parse, serialize, validate, type PhantomBladeZeroState } from '../../src/games/phantom-blade-zero/parse'
import { parsePbzsContainer } from '../../src/games/phantom-blade-zero/codec/container'
import {
  addInventoryItem,
  projectInventory,
  projectResources,
  setDust,
  setMaterialAmount
} from '../../src/games/phantom-blade-zero/model/saveModel'

const SAVE = process.env.PBZ_SAVE
const MAX_DUST = 99_999_999
const MAX_MATERIAL_AMOUNT = 9999
const FIXED_DATE = new Date(2026, 9, 30, 18, 20, 30)

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
    expect(reparsed.container.slots).toHaveLength(before.container.slots.length)
    expect(reparsed.container.slots.map(({ entry }) => entry.name)).toEqual(
      before.container.slots.map(({ entry }) => entry.name)
    )
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

    const [serialized] = await serialize(state)
    const after = await parsePbzsContainer(serialized!.bytes)

    expect(after.slots).toHaveLength(state.container.slots.length)
    expect(after.slots.map(({ entry }) => entry.name)).toEqual(
      state.container.slots.map(({ entry }) => entry.name)
    )
    for (const [index, slot] of state.container.slots.entries()) {
      if (slot.entry.name === edit.slotName) continue
      expect(Buffer.compare(after.slots[index]!.sealedBytes, slot.sealedBytes)).toBe(0)
    }
  })

  it('adds an absent weapon-upgrade material in memory and preserves every other sealed slot', async (context) => {
    await expectAbsentCatalogAdd(context, 'weapon-material')
  })

  it('adds an absent traversing consumable in memory and preserves every other sealed slot', async (context) => {
    await expectAbsentCatalogAdd(context, 'consumable')
  })

  async function expectAbsentCatalogAdd(
    context: { skip: (reason?: string) => void },
    category: PbzItemCategory
  ): Promise<void> {
    const state = await parseOriginal()
    const target = findAbsentCatalogItem(state, category)
    if (!target) {
      context.skip(`no absent ${category} in this save`)
      return
    }

    addInventoryItem(state.model, target.slotName, target.item.id, 1, FIXED_DATE)
    expect(validate(state)).toEqual([])

    const [serialized] = await serialize(state)
    const reparsed = await parse([serialized!])
    const editedSlot = reparsed.model.slots.find(({ name }) => name === target.slotName)!
    const infos = inventoryInfos(editedSlot.document)
    const record = infos[target.item.id] as Record<string, unknown>

    expect(validate(reparsed)).toEqual([])
    expect(record).toMatchObject({
      CurrentAmount: 1,
      MaxAmount: category === 'consumable' ? target.item.maxAmount : 1,
      FirstAddTime: '2026.10.30-18.20.30',
      DirtyTime: '2026.10.30-18.20.30'
    })
    expect(Number.isSafeInteger(record.AcquiredCycle)).toBe(true)
    expect(projectInventory(editedSlot, category).some(({ id }) => id === target.item.id)).toBe(true)

    const after = await parsePbzsContainer(serialized!.bytes)
    expect(after.slots.map(({ entry }) => entry.name)).toEqual(
      state.container.slots.map(({ entry }) => entry.name)
    )
    for (const [index, slot] of state.container.slots.entries()) {
      if (slot.entry.name === target.slotName) continue
      expect(Buffer.compare(after.slots[index]!.sealedBytes, slot.sealedBytes)).toBe(0)
    }
  }
})

function findAbsentCatalogItem(
  state: PhantomBladeZeroState,
  category: PbzItemCategory
): { slotName: string; item: (typeof pbzCatalog)[number] } | null {
  for (const slot of state.model.slots) {
    const existing = new Set(projectInventory(slot, category).map(({ id }) => id))
    const item = pbzCatalog.find((candidate) =>
      candidate.category === category && !existing.has(candidate.id)
    )
    if (item) return { slotName: slot.name, item }
  }
  return null
}

function inventoryInfos(document: Record<string, unknown>): Record<string, unknown> {
  const inventory = document.Inventory as Record<string, unknown>
  return inventory.InventoryInfos as Record<string, unknown>
}
