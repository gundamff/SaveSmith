import { describe, expect, it } from 'vitest'

import {
  getPbzEquipment,
  pbzEquipmentCatalog,
  searchPbzEquipment,
} from '@games/phantom-blade-zero/catalog/equipmentCatalog'

describe('PBZ equipment catalog', () => {
  it('ships supported rows for main weapons, phantoms, and accessories', () => {
    const counts = {
      'main-weapon': 0,
      'phantom-weapon': 0,
      accessory: 0,
    }
    for (const row of pbzEquipmentCatalog) {
      counts[row.category] += 1
      expect(row.id.length).toBeGreaterThan(0)
      expect(row.maxLevel).toBeGreaterThanOrEqual(0)
    }
    expect(counts['main-weapon']).toBeGreaterThan(0)
    expect(counts['phantom-weapon']).toBeGreaterThan(0)
    expect(counts.accessory).toBeGreaterThan(0)
  })

  it('looks up WoodenSword / BrutalAxe / AC_Loot and filters experimental-looking ids', () => {
    expect(getPbzEquipment('WoodenSword')?.category).toBe('main-weapon')
    expect(getPbzEquipment('BrutalAxe')?.category).toBe('phantom-weapon')
    expect(getPbzEquipment('AC_Loot')?.category).toBe('accessory')
    expect(
      pbzEquipmentCatalog.some((row) => /test|debug|placeholder/i.test(row.id)),
    ).toBe(false)
  })

  it('searches accessories by Chinese name', () => {
    const hits = searchPbzEquipment('accessory', '聚宝')
    expect(hits.some((row) => row.id === 'AC_Loot')).toBe(true)
  })
})
