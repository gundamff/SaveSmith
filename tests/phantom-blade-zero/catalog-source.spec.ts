import { describe, expect, it } from 'vitest'
import items from '../../src/games/phantom-blade-zero/catalog/items.json'
import {
  getBossDisplayName,
  listBossCatalogIds
} from '../../src/games/phantom-blade-zero/catalog/bosses'

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

describe('phantom-blade-zero boss catalog', () => {
  it('ships Codex-derived Chinese names for known bosses', () => {
    const ids = listBossCatalogIds()
    expect(ids.length).toBeGreaterThanOrEqual(177)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getBossDisplayName('BP_Monster_PengMeng_Axe', 'zh')).toBe('斧老大：彭猛')
    expect(getBossDisplayName('BP_Monster_ZuoShang', 'zh')).toContain('左殇')
    expect(getBossDisplayName('BP_Monster_AHua_GuiTouDao', 'zh')).toContain('阿花')
    // Save-only aliases not present as Codex row keys:
    expect(getBossDisplayName('BP_Monster_HookMan', 'zh')).toContain('追命')
    expect(getBossDisplayName('BP_Monster_YuCong', 'zh')).toContain('玉琮')
    // Empty en falls back to readable ID:
    expect(getBossDisplayName('BP_Monster_PengMeng_Axe', 'en')).toBe('PengMeng Axe')
  })
})
