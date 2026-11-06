import { describe, expect, it } from 'vitest'

import {
  addEquipment,
  projectEquipment,
  removeEquipment,
  setEquipmentLevel,
} from '@games/phantom-blade-zero/model/equipment'
import type { PbzSaveModel } from '@games/phantom-blade-zero/model/saveModel'

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
  it('maps UI level to WeaponLevel = UI + 1 for main weapons', () => {
    const model = slotDoc({ MainWeaponInfos: {} })
    addEquipment(model, 'AutoSave0', 'WoodenSword', 3)
    const rows = projectEquipment(model.slots[0]!, 'main-weapon')
    expect(rows).toEqual([
      expect.objectContaining({ id: 'WoodenSword', level: 3 }),
    ])
    const record = (model.slots[0]!.document as any).Inventory.MainWeaponInfos
      .WoodenSword
    expect(record.WeaponLevel).toBe(4)
    expect(record.HasUIRedPoint).toBe(true)
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
})
