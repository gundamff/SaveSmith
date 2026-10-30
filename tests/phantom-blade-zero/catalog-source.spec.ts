import { describe, expect, it } from 'vitest'
import items from '../../src/games/phantom-blade-zero/catalog/items.json'

const GROWTH_IDS = [
  'Ac_Material_1',
  'Ac_Material_4',
  'I_060002',
  'Item_001',
  'Item_002',
  'Item_Piece_001',
  'Item_Piece_002',
  'Item_Traversing',
  'Medi_Material_1',
  'Medi_Material_2',
  'Medi_Material_3',
  'ShaqiHexin',
]

describe('phantom-blade-zero item catalog', () => {
  it('ships only complete supported PBZ catalog rows', () => {
    expect(items.length).toBeGreaterThan(0)
    expect(new Set(items.map(({ id }) => id)).size).toBe(items.length)
    for (const row of items) {
      expect(row.id).toMatch(/^[A-Za-z0-9_]+$/)
      expect(['weapon-material', 'consumable']).toContain(row.category)
      expect(row.zh || row.en).toBeTruthy()
      expect(Number.isSafeInteger(row.maxAmount)).toBe(true)
      expect(row.maxAmount).toBeGreaterThan(0)
      expect(typeof row.thresholdRisk).toBe('boolean')
    }
  })

  it('does not expose snap-soul, memory flower, or book IDs', () => {
    const ids = new Set(items.map(({ id }) => id))
    expect(ids.has('FA_0300')).toBe(false)
    expect([...ids].some((id) => /MemoryFlower|SnapSoul|^Book_/i.test(id))).toBe(false)
    expect(JSON.stringify(items)).not.toMatch(/记忆之花/)
  })

  it('locks the catalog to the audited category allowlists', () => {
    const consumables = items.filter(({ category }) => category === 'consumable')
    expect(consumables.map(({ id }) => id).sort()).toEqual([...GROWTH_IDS])
    expect(consumables.find(({ id }) => id === 'Item_Traversing')?.maxAmount).toBe(99)
    expect(
      consumables.filter(({ thresholdRisk }) => thresholdRisk).map(({ id }) => id).sort()
    ).toEqual(['Item_001', 'Item_002', 'Item_Piece_001', 'Item_Piece_002'])

    const materials = items.filter(({ category }) => category === 'weapon-material')
    expect(materials).toHaveLength(27)
    expect(materials.every(({ id }) => id.startsWith('Weapon_Material_'))).toBe(true)
    expect(items).toHaveLength(39)
  })
})
