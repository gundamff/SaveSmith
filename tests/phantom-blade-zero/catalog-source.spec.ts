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

const SNAP_SOUL_IDS = [
  'TU_01001',
  'TU_02001',
  'TU_02002',
  'TU_03001',
  'TU_03002',
  'TU_03003',
  'TU_04001',
  'TU_04003',
  'TU_05001',
  'TU_05003',
  'TU_05004',
  'TU_05005',
  'TU_06001',
  'TU_06002',
  'TU_06004',
  'TU_06005',
  'TU_07001',
  'TU_07002',
  'TU_08001',
  'TU_08002',
  'TU_09001',
  'TU_09002',
  'TU_09003',
  'TU_09004',
  'TU_0901',
  'TU_10001',
  'TU_10002',
  'TU_10003',
  'TU_11001',
  'TU_11002',
  'TU_11003',
  'TU_11004',
  'TU_11005',
  'TU_11006',
  'TU_11007',
  'TU_11008',
  'TU_11009',
  'TU_1101',
  'TU_11010',
  'TU_11011',
  'TU_11012',
  'TU_11013',
  'TU_12001',
  'TU_12002',
  'TU_12003',
  'TU_13001',
  'TU_13004',
  'TU_13005',
  'TU_1302',
  'TU_14001',
  'TU_15001',
  'TU_150011',
  'TU_150012',
  'TU_15002',
  'TU_150021',
  'TU_150022',
  'TU_17001',
  'TU_18001',
  'TU_18008',
  'TU_18009',
  'TU_180091',
  'TU_180092',
  'TU_180093',
  'TU_180094',
  'TU_18010',
  'TU_18011',
  'TU_18012',
  'TU_18013',
  'TU_19001',
  'TU_19002',
  'TU_19004',
  'TU_19005',
  'TU_19006',
] as const

describe('phantom-blade-zero item catalog', () => {
  it('ships only complete supported PBZ catalog rows', () => {
    expect(items.length).toBeGreaterThan(0)
    expect(new Set(items.map(({ id }) => id)).size).toBe(items.length)
    for (const row of items) {
      expect(row.id).toMatch(/^[A-Za-z0-9_]+$/)
      expect(['weapon-material', 'consumable', 'snap-soul-material']).toContain(row.category)
      expect(row.zh || row.en).toBeTruthy()
      expect(Number.isSafeInteger(row.maxAmount)).toBe(true)
      expect(row.maxAmount).toBeGreaterThan(0)
      expect(typeof row.thresholdRisk).toBe('boolean')
    }
  })

  it('exposes audited snap-soul materials and still excludes literature / placeholders', () => {
    const ids = new Set(items.map(({ id }) => id))
    expect(ids.has('TU_02001')).toBe(true)
    expect(ids.has('I_000006')).toBe(false)
    expect(ids.has('FA_0300')).toBe(false)
    expect([...ids].some((id) => /MemoryFlower|^Book_/i.test(id))).toBe(false)
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

    const snapSoul = items.filter(({ category }) => category === 'snap-soul-material')
    expect(snapSoul.map(({ id }) => id).sort()).toEqual([...SNAP_SOUL_IDS])
    expect(snapSoul.every(({ maxAmount, thresholdRisk, en }) =>
      maxAmount === 9999 && thresholdRisk === false && en === ''
    )).toBe(true)
    expect(items).toHaveLength(39 + SNAP_SOUL_IDS.length)
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
