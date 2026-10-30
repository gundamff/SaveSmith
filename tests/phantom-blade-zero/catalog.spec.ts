import { afterEach, describe, expect, it } from 'vitest'
import {
  getPbzItem,
  pbzCatalog,
  pbzItemName,
  searchPbzItems,
  type PbzCatalogItem,
} from '../../src/games/phantom-blade-zero/catalog'
import { setLocale } from '../../src/host/i18n'

afterEach(() => {
  setLocale('zh')
})

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
] as const

describe('phantom-blade-zero catalog API', () => {
  it('exposes only the audited immutable catalog rows', () => {
    expect(pbzCatalog).toHaveLength(39)
    expect(pbzCatalog.every((row) =>
      row.category === 'weapon-material' || row.category === 'consumable'
    )).toBe(true)
    expect(Object.isFrozen(pbzCatalog)).toBe(true)
    expect(pbzCatalog.every(Object.isFrozen)).toBe(true)
  })

  it('looks up real catalog items by exact ID', () => {
    const item = getPbzItem('Item_Traversing')

    expect(item).toEqual({
      id: 'Item_Traversing',
      category: 'consumable',
      zh: '穿行符',
      en: '',
      maxAmount: 99,
      thresholdRisk: false,
    })
    expect(getPbzItem('item_traversing')).toBeUndefined()
    expect(getPbzItem('missing')).toBeUndefined()
  })

  it('marks threshold collectibles for UI warnings', () => {
    expect(getPbzItem('Item_Piece_001')?.thresholdRisk).toBe(true)
    expect(getPbzItem('Item_001')?.thresholdRisk).toBe(true)
    expect(getPbzItem('ShaqiHexin')?.thresholdRisk).toBe(false)
    expect(getPbzItem('Weapon_Material_01')?.thresholdRisk).toBe(false)
  })

  it('uses the requested language and avoids Chinese fallback in English UI', () => {
    const sample = getPbzItem('Weapon_Material_01')
    expect(sample).toBeDefined()
    expect(pbzItemName(sample!, 'zh')).toBe('铸造金属')
    expect(pbzItemName(sample!, 'en')).toBe('Weapon Material 01')
    expect(pbzItemName(getPbzItem('Item_Traversing')!, 'en')).toBe('Item Traversing')

    const englishOnly: PbzCatalogItem = {
      ...sample!,
      zh: '',
      en: 'Official English',
    }
    expect(pbzItemName(englishOnly, 'zh')).toBe('Official English')
    expect(pbzItemName(englishOnly, 'en')).toBe('Official English')
  })

  it('localizes unknown items while preserving the raw ID', () => {
    const unnamed: PbzCatalogItem = {
      id: 'Raw_Item_ID',
      category: 'weapon-material',
      zh: '',
      en: '',
      maxAmount: 9999,
      thresholdRisk: false,
    }

    setLocale('zh')
    expect(pbzItemName(unnamed, 'zh')).toBe('未知物品 (Raw_Item_ID)')
    setLocale('en')
    expect(pbzItemName(unnamed, 'en')).toBe('Unknown item (Raw_Item_ID)')
  })

  it('searches real material names and IDs case-insensitively', () => {
    const sample = getPbzItem('Weapon_Material_01')
    expect(sample).toBeDefined()

    expect(searchPbzItems('weapon-material', sample!.zh.slice(0, 2))).toContainEqual(sample)
    expect(searchPbzItems(sample!.category, sample!.id.toLowerCase())).toContainEqual(sample)
  })

  it('limits empty searches to the requested category', () => {
    expect(searchPbzItems('weapon-material', '')).toHaveLength(27)
    expect(searchPbzItems('consumable', '   ').map(({ id }) => id).sort()).toEqual([...GROWTH_IDS])
  })

  it('exposes growth items and excludes memory flowers / books', () => {
    expect(searchPbzItems('consumable', '黑石碎片').map(({ id }) => id)).toEqual(['Item_Piece_001'])
    expect(searchPbzItems('consumable', '杀气琥珀').map(({ id }) => id).sort()).toEqual([
      'Item_002',
      'Item_Piece_002',
    ])
    expect(searchPbzItems('consumable', '记忆之花')).toEqual([])
    expect(getPbzItem('FA_0300')).toBeUndefined()
  })
})
