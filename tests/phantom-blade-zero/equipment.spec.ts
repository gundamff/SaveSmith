import { describe, expect, it } from 'vitest'

import {
  addEquipment,
  collectEquipmentIssues,
  fromDisplayLevel,
  projectEquipment,
  removeEquipment,
  setEquipmentLevel,
  toDisplayLevel,
} from '@games/phantom-blade-zero/model/equipment'
import type { PbzEditableSlot, PbzSaveModel } from '@games/phantom-blade-zero/model/saveModel'
import type { ValidationIssue } from '@sdk/types'

function slotDoc(inventory: Record<string, unknown>): PbzSaveModel {
  return {
    selectedSlotName: 'AutoSave0',
    slots: [
      {
        name: 'AutoSave0',
        dirty: false,
        document: {
          Inventory: inventory,
          Player: { Dust: 0 },
          PBZGameSystem: { CycleCount: 0 },
        },
      },
    ],
  } as unknown as PbzSaveModel
}

describe('PBZ equipment model', () => {
  it('maps 0-based strengthen count to WeaponLevel = count + 1', () => {
    const model = slotDoc({ MainWeaponInfos: {} })
    addEquipment(model, 'AutoSave0', 'WoodenSword', 3)
    const rows = projectEquipment(model.slots[0]!, 'main-weapon')
    expect(rows).toEqual([
      expect.objectContaining({ id: 'WoodenSword', level: 3 }),
    ])
    expect(toDisplayLevel('main-weapon', rows[0]!.level)).toBe(4)
    const record = (model.slots[0]!.document as any).Inventory.MainWeaponInfos
      .WoodenSword
    expect(record.WeaponLevel).toBe(4)
    expect(record.HasUIRedPoint).toBe(true)
  })

  it('shows game grade 20 when WeaponLevel is 20', () => {
    const model = slotDoc({
      MainWeaponInfos: {
        WoodenSword: { WeaponLevel: 20, HasUIRedPoint: false },
      },
    })
    const [row] = projectEquipment(model.slots[0]!, 'main-weapon')
    expect(row!.level).toBe(19)
    expect(toDisplayLevel('main-weapon', row!.level)).toBe(20)
    expect(fromDisplayLevel('main-weapon', 20)).toBe(19)
  })

  it('maps phantom UI level to ShaChiWeaponLevel = UI + 1', () => {
    const model = slotDoc({ ShaChiWeaponInfo: {} })
    addEquipment(model, 'AutoSave0', 'BrutalAxe', 1)
    const record = (model.slots[0]!.document as any).Inventory.ShaChiWeaponInfo
      .BrutalAxe
    expect(record.ShaChiWeaponLevel).toBe(2)
  })

  it('stores accessory CurrentLevel equal to UI level', () => {
    const model = slotDoc({ AccessoryInfos: {} })
    addEquipment(model, 'AutoSave0', 'AC_Loot', 1)
    const record = (model.slots[0]!.document as any).Inventory.AccessoryInfos
      .AC_Loot
    expect(record.CurrentLevel).toBe(1)
  })

  it('refuses to delete an equipped main weapon', () => {
    const model = slotDoc({
      MainWeaponInfos: {
        WoodenSword: { WeaponLevel: 1, HasUIRedPoint: false },
      },
      MainWeapons: ['WoodenSword'],
      CurrentMainWeaponID: 'WoodenSword',
    })
    expect(() =>
      removeEquipment(model, 'AutoSave0', 'WoodenSword'),
    ).toThrow(/PBZ_INVALID_EDIT|WoodenSword/)
  })

  it('clears AccessoryIDs slots to None before deleting an accessory', () => {
    const model = slotDoc({
      AccessoryInfos: {
        AC_Loot: { CurrentLevel: 0, HasUIRedPoint: false },
      },
      AccessoryIDs: ['AC_Loot', 'None'],
    })
    removeEquipment(model, 'AutoSave0', 'AC_Loot')
    const inv = (model.slots[0]!.document as any).Inventory
    expect(inv.AccessoryInfos.AC_Loot).toBeUndefined()
    expect(inv.AccessoryIDs).toEqual(['None', 'None'])
  })

  it('setEquipmentLevel updates existing records and marks dirty', () => {
    const model = slotDoc({
      AccessoryInfos: {
        AC_Loot: { CurrentLevel: 0, HasUIRedPoint: false, AcquiredCycle: 0 },
      },
    })
    setEquipmentLevel(model, 'AutoSave0', 'AC_Loot', 1)
    expect(model.slots[0]!.dirty).toBe(true)
    expect(
      (model.slots[0]!.document as any).Inventory.AccessoryInfos.AC_Loot
        .CurrentLevel,
    ).toBe(1)
  })

  it('treats missing ShaChiWeaponLevel as strengthen 0 and does not invalidate', () => {
    const model = slotDoc({
      ShaChiWeaponInfo: {
        CaoOuSiXian: {
          AcquiredCycle: 0,
          FirstAcquiredCycle: 0,
          DirtyTime: '2026.11.06-22.01.06',
          AlreadySnapSoul: false,
        },
      },
    })
    const [row] = projectEquipment(model.slots[0]!, 'phantom-weapon')
    expect(row).toEqual(
      expect.objectContaining({ id: 'CaoOuSiXian', level: 0 }),
    )
    const issues: ValidationIssue[] = []
    collectEquipmentIssues(model.slots[0]! as PbzEditableSlot, issues)
    expect(issues).toEqual([])
  })

  it('treats missing WeaponLevel / CurrentLevel as 0 without invalidating', () => {
    const model = slotDoc({
      MainWeaponInfos: {
        WoodenSword: { DateTime: '2026.11.06-22.01.06', AlreadySnapSoul: 0 },
      },
      AccessoryInfos: {
        AC_Loot: { DirtyTime: '2026.11.06-22.01.06', AcquiredCycle: 0 },
      },
    })
    expect(projectEquipment(model.slots[0]!, 'main-weapon')[0]?.level).toBe(0)
    expect(projectEquipment(model.slots[0]!, 'accessory')[0]?.level).toBe(0)
    const issues: ValidationIssue[] = []
    collectEquipmentIssues(model.slots[0]! as PbzEditableSlot, issues)
    expect(issues).toEqual([])
  })

  it('still rejects non-integer equipment levels', () => {
    const model = slotDoc({
      ShaChiWeaponInfo: {
        CaoOuSiXian: { ShaChiWeaponLevel: 1.5, AlreadySnapSoul: false },
      },
    })
    const issues: ValidationIssue[] = []
    collectEquipmentIssues(model.slots[0]! as PbzEditableSlot, issues)
    expect(issues).toContainEqual({
      code: 'PBZ_INVALID_EQUIPMENT',
      args: ['AutoSave0', 'CaoOuSiXian'],
    })
  })
})
