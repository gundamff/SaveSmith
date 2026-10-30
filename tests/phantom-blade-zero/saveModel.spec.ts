import { describe, expect, it } from 'vitest'
import { ModuleError } from '../../src/sdk/error'
import {
  createSaveModel,
  getSelectedSlot,
  isEditableSlotName,
  parseEditableSlot,
  projectResources,
  selectSlot,
  serializeDirtySlots,
  setAllExistingMaterials,
  setDust,
  setMaterialAmount,
  validateSaveModel,
  type PbzEditableSlot
} from '../../src/games/phantom-blade-zero/model/saveModel'

const encoder = new TextEncoder()

function payload(document: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(document))
}

function document(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    UnknownRoot: { preserved: true },
    Player: { Dust: 10, title: 'unknown-player-field' },
    Inventory: {
      inventoryExtra: 'preserved',
      InventoryInfos: {
        Weapon_Material_Z: {
          CurrentAmount: 3,
          MaxAmount: 35,
          FirstAddTime: 'synthetic',
          extra: { preserved: true }
        },
        Weapon_Material_A: {
          CurrentAmount: 7,
          MaxAmount: 7
        },
        Quest_Item: {
          CurrentAmount: 1,
          MaxAmount: 1
        }
      }
    },
    ...overrides
  }
}

function slot(name = 'ManualSave1', overrides: Record<string, unknown> = {}): PbzEditableSlot {
  return parseEditableSlot(name, payload(document(overrides)))
}

function expectModuleError(action: () => unknown, code: string, args?: Array<string | number>): void {
  try {
    action()
    throw new Error('expected ModuleError')
  } catch (error) {
    expect(error).toBeInstanceOf(ModuleError)
    expect((error as ModuleError).code).toBe(code)
    if (args) expect((error as ModuleError).args).toEqual(args)
  }
}

describe('phantom-blade-zero save model', () => {
  it('recognizes only numbered auto and manual save slots', () => {
    expect(isEditableSlotName('AutoSave0')).toBe(true)
    expect(isEditableSlotName('ManualSave42')).toBe(true)
    expect(isEditableSlotName('__Advanced__')).toBe(false)
    expect(isEditableSlotName('__Achievements__')).toBe(false)
    expect(isEditableSlotName('ManualSave')).toBe(false)
    expect(isEditableSlotName('Unknown1')).toBe(false)
  })

  it('rejects parsing read-only slot names', () => {
    expectModuleError(
      () => parseEditableSlot('__Advanced__', payload(document())),
      'PBZ_SLOT_READ_ONLY',
      ['__Advanced__']
    )
  })

  it.each([
    ['invalid UTF-8', new Uint8Array([0xc3, 0x28])],
    ['invalid JSON', encoder.encode('{')],
    ['array root', payload([])],
    ['null root', payload(null)],
    ['missing Player', payload({})],
    ['non-object Player', payload({ Player: [] })],
    ['non-integer Dust', payload({ Player: { Dust: 1.5 } })],
    ['negative Dust', payload({ Player: { Dust: -1 } })],
    ['oversized Dust', payload({ Player: { Dust: 100_000_000 } })],
    ['non-object Inventory', payload({ Player: { Dust: 1 }, Inventory: [] })],
    [
      'non-object InventoryInfos',
      payload({ Player: { Dust: 1 }, Inventory: { InventoryInfos: null } })
    ]
  ])('rejects %s as invalid JSON structure', (_label, bytes) => {
    expectModuleError(
      () => parseEditableSlot('AutoSave1', bytes),
      'PBZ_INVALID_JSON',
      ['AutoSave1']
    )
  })

  it('projects eligible materials in stable id order and returns snapshots', () => {
    const editable = slot()
    const first = projectResources(editable)

    expect(first).toEqual({
      dust: 10,
      materials: [
        { id: 'Weapon_Material_A', currentAmount: 7, maxAmount: 7 },
        { id: 'Weapon_Material_Z', currentAmount: 3, maxAmount: 35 }
      ]
    })

    first.materials[0]!.currentAmount = 999
    expect(projectResources(editable).materials[0]!.currentAmount).toBe(7)
  })

  it('excludes pseudo-materials and malformed material entries', () => {
    const editable = slot('ManualSave2', {
      Inventory: {
        InventoryInfos: {
          Weapon_Material_Good: { CurrentAmount: 1, MaxAmount: 2 },
          Weapon_Material_Array: [],
          Weapon_Material_Missing: { CurrentAmount: 1 },
          Weapon_Material_Float: { CurrentAmount: 1.5, MaxAmount: 2 },
          Other: { CurrentAmount: 1, MaxAmount: 2 }
        }
      }
    })

    expect(projectResources(editable).materials).toEqual([
      { id: 'Weapon_Material_Good', currentAmount: 1, maxAmount: 2 }
    ])
  })

  it('treats missing inventory as no materials without creating it', () => {
    const editable = slot('AutoSave2', { Inventory: undefined })
    delete editable.document.Inventory

    expect(projectResources(editable)).toEqual({ dust: 10, materials: [] })
    const model = createSaveModel([editable])
    setAllExistingMaterials(model, editable.name)
    expect(editable.document).not.toHaveProperty('Inventory')
    expect(editable.dirty).toBe(false)
  })

  it('edits Dust within bounds and dirties only on a real change', () => {
    const editable = slot()
    const model = createSaveModel([editable])

    setDust(model, editable.name, 10)
    expect(editable.dirty).toBe(false)
    setDust(model, editable.name, 0)
    expect(projectResources(editable).dust).toBe(0)
    expect(editable.dirty).toBe(true)
    setDust(model, editable.name, 99_999_999)
    expect(projectResources(editable).dust).toBe(99_999_999)
  })

  it.each([-1, 1.5, 100_000_000, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid Dust target %s',
    (value) => {
      const editable = slot()
      const model = createSaveModel([editable])
      expectModuleError(() => setDust(model, editable.name, value), 'PBZ_INVALID_EDIT')
      expect(projectResources(editable).dust).toBe(10)
      expect(editable.dirty).toBe(false)
    }
  )

  it('raises MaxAmount on increase, preserves it on decrease, and ignores same value', () => {
    const editable = slot()
    const model = createSaveModel([editable])

    setMaterialAmount(model, editable.name, 'Weapon_Material_Z', 40)
    expect(projectResources(editable).materials[1]).toEqual({
      id: 'Weapon_Material_Z',
      currentAmount: 40,
      maxAmount: 40
    })
    setMaterialAmount(model, editable.name, 'Weapon_Material_Z', 2)
    expect(projectResources(editable).materials[1]!.maxAmount).toBe(40)

    const clean = slot('AutoSave3')
    const cleanModel = createSaveModel([clean])
    setMaterialAmount(cleanModel, clean.name, 'Weapon_Material_A', 7)
    expect(clean.dirty).toBe(false)
  })

  it.each([-1, 1.5, 10_000, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid material target %s without changing keys',
    (value) => {
      const editable = slot()
      const model = createSaveModel([editable])
      const infos = (
        editable.document.Inventory as Record<string, unknown>
      ).InventoryInfos as Record<string, unknown>
      const keys = Object.keys(infos)

      expectModuleError(
        () => setMaterialAmount(model, editable.name, 'Weapon_Material_A', value),
        'PBZ_INVALID_EDIT'
      )
      expect(Object.keys(infos)).toEqual(keys)
      expect(editable.dirty).toBe(false)
    }
  )

  it('rejects absent, non-whitelisted, and structurally changed material ids', () => {
    const editable = slot()
    const model = createSaveModel([editable])
    const infos = (
      editable.document.Inventory as Record<string, unknown>
    ).InventoryInfos as Record<string, unknown>
    const keys = Object.keys(infos)

    expectModuleError(
      () => setMaterialAmount(model, editable.name, 'Weapon_Material_Missing', 1),
      'PBZ_INVALID_EDIT',
      ['Weapon_Material_Missing']
    )
    expectModuleError(
      () => setMaterialAmount(model, editable.name, 'Quest_Item', 1),
      'PBZ_INVALID_EDIT',
      ['Quest_Item']
    )
    ;(infos.Weapon_Material_A as Record<string, unknown>).MaxAmount = 'broken'
    expectModuleError(
      () => setMaterialAmount(model, editable.name, 'Weapon_Material_A', 1),
      'PBZ_INVALID_EDIT',
      ['Weapon_Material_A']
    )
    expect(Object.keys(infos)).toEqual(keys)
  })

  it('bulk edits every existing eligible material with default and explicit targets', () => {
    const editable = slot()
    const model = createSaveModel([editable])
    const infos = (
      editable.document.Inventory as Record<string, unknown>
    ).InventoryInfos as Record<string, unknown>
    const keys = Object.keys(infos)

    setAllExistingMaterials(model, editable.name)
    expect(projectResources(editable).materials.every((item) => item.currentAmount === 9999)).toBe(
      true
    )
    expect(projectResources(editable).materials.every((item) => item.maxAmount === 9999)).toBe(true)
    setAllExistingMaterials(model, editable.name, 4)
    expect(projectResources(editable).materials.every((item) => item.currentAmount === 4)).toBe(true)
    expect(projectResources(editable).materials.every((item) => item.maxAmount === 9999)).toBe(true)
    expect(Object.keys(infos)).toEqual(keys)
  })

  it('selects only existing editable slots without changing dirty state', () => {
    const first = slot('AutoSave1')
    const second = slot('ManualSave2')
    second.dirty = true
    const model = createSaveModel([first, second])

    expect(model.selectedSlotName).toBeNull()
    expect(getSelectedSlot(model)).toBeNull()
    selectSlot(model, second.name)
    expect(getSelectedSlot(model)).toBe(second)
    expect(second.dirty).toBe(true)
    expectModuleError(() => selectSlot(model, 'AutoSave99'), 'PBZ_INVALID_EDIT', ['AutoSave99'])
    expectModuleError(() => selectSlot(model, '__Advanced__'), 'PBZ_INVALID_EDIT', ['__Advanced__'])
  })

  it('serializes only dirty slots and preserves unknown fields', () => {
    const dirty = slot('ManualSave1')
    const clean = slot('AutoSave1')
    const model = createSaveModel([dirty, clean])

    setMaterialAmount(model, dirty.name, 'Weapon_Material_Z', 50)
    const serialized = serializeDirtySlots(model)
    expect([...serialized.keys()]).toEqual(['ManualSave1'])

    const result = JSON.parse(new TextDecoder().decode(serialized.get(dirty.name)!))
    expect(result.UnknownRoot).toEqual({ preserved: true })
    expect(result.Player.title).toBe('unknown-player-field')
    expect(result.Inventory.inventoryExtra).toBe('preserved')
    expect(result.Inventory.InventoryInfos.Weapon_Material_Z).toMatchObject({
      CurrentAmount: 50,
      MaxAmount: 50,
      FirstAddTime: 'synthetic',
      extra: { preserved: true }
    })
    expect(result.Inventory.InventoryInfos.Quest_Item).toEqual({
      CurrentAmount: 1,
      MaxAmount: 1
    })
  })

  it('validates selection, duplicate names, Dust, material amount, and MaxAmount relation', () => {
    const first = slot('AutoSave1')
    const duplicate = slot('AutoSave1')
    const model = createSaveModel([first, duplicate])
    model.selectedSlotName = 'ManualSave404'
    ;(first.document.Player as Record<string, unknown>).Dust = -1
    const infos = (
      first.document.Inventory as Record<string, unknown>
    ).InventoryInfos as Record<string, unknown>
    ;(infos.Weapon_Material_A as Record<string, unknown>).CurrentAmount = 10_000
    ;(infos.Weapon_Material_Z as Record<string, unknown>).MaxAmount = 1

    const codes = validateSaveModel(model).map((issue) => issue.code)
    expect(codes).toContain('PBZ_INVALID_SELECTION')
    expect(codes).toContain('PBZ_DUPLICATE_SLOT')
    expect(codes).toContain('PBZ_INVALID_DUST')
    expect(codes).toContain('PBZ_INVALID_MATERIAL_AMOUNT')
    expect(codes).toContain('PBZ_INVALID_MATERIAL_MAX')
  })

  it('reports unsafe public document mutations instead of throwing', () => {
    const editable = slot()
    const model = createSaveModel([editable])
    editable.document.Inventory = []

    expect(() => validateSaveModel(model)).not.toThrow()
    expect(validateSaveModel(model).map((issue) => issue.code)).toContain('PBZ_INVALID_INVENTORY')
  })

  it('blocks serialization after direct invalid document mutation', () => {
    const editable = slot()
    const model = createSaveModel([editable])
    setDust(model, editable.name, 11)
    ;(editable.document.Player as Record<string, unknown>).Dust = 100_000_000

    expectModuleError(
      () => serializeDirtySlots(model),
      'PBZ_INVALID_EDIT',
      ['PBZ_INVALID_DUST']
    )
  })

  it('supports an empty model and reports duplicate slots without crashing', () => {
    const empty = createSaveModel([])
    expect(empty).toEqual({ slots: [], selectedSlotName: null })
    expect(getSelectedSlot(empty)).toBeNull()
    expect(validateSaveModel(empty)).toEqual([])
    expect(serializeDirtySlots(empty).size).toBe(0)
  })
})
