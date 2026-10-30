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

describe('phantom-blade-zero catalog API', () => {
  it('exposes only the audited immutable catalog rows', () => {
    expect(pbzCatalog).toHaveLength(28)
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
    })
    expect(getPbzItem('item_traversing')).toBeUndefined()
    expect(getPbzItem('missing')).toBeUndefined()
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
    expect(searchPbzItems('consumable', '   ')).toEqual([
      getPbzItem('Item_Traversing'),
    ])
  })

  it('does not expose threshold collectibles through search', () => {
    expect(searchPbzItems('consumable', '记忆之花')).toEqual([])
    expect(searchPbzItems('consumable', '黑石碎片')).toEqual([])
    expect(searchPbzItems('consumable', '杀气琥珀')).toEqual([])
  })
})
