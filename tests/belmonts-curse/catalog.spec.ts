import { describe, expect, it } from 'vitest'
import {
  ADDABLE_CATEGORIES,
  catalogIdsByCategory,
  getItemCategory,
  isAddableCategory,
  searchCatalogOptions
} from '../../src/games/belmonts-curse/catalog/names'
import { catalogReady } from '../../src/games/belmonts-curse/catalog/ready'

describe('belmonts-curse catalog categories (policy B)', () => {
  it('ships categories and catalogReady still passes', () => {
    expect(catalogReady()).toBe(true)
    expect(getItemCategory('WeaponFistTier1')).toBe('weapon')
    expect(getItemCategory('Charm_BoostDamageAfterSpell')).toBe('charm')
    expect(getItemCategory('BoomerangCross')).toBe('spell')
    expect(getItemCategory('Skin_MC_Base')).toBe('skin')
    expect(getItemCategory('Clue_Doppelganger_FirstCard')).toBe('clue')
    expect(getItemCategory('Clue_SaintLouis_ScaleText')).toBe('clue')
  })

  it('addable set excludes clue and key', () => {
    expect(ADDABLE_CATEGORIES.has('weapon')).toBe(true)
    expect(ADDABLE_CATEGORIES.has('clue')).toBe(false)
    expect(isAddableCategory('clue')).toBe(false)
    expect(isAddableCategory('key')).toBe(false)
    expect(isAddableCategory('weapon')).toBe(true)
  })

  it('searchCatalogOptions never returns clues/keys/abstract weapons; category filter works', () => {
    const all = searchCatalogOptions('', 'zh', 500)
    expect(all.some((o) => o.id.startsWith('Clue_'))).toBe(false)
    expect(all.some((o) => getItemCategory(o.id) === 'key')).toBe(false)
    expect(all.some((o) => o.id === 'WeaponWhip')).toBe(false)
    expect(all.some((o) => o.id === 'Charm_BoostDamageAfterSpell')).toBe(true)

    const charms = searchCatalogOptions('', 'en', 80, 'charm')
    expect(charms.length).toBeGreaterThan(0)
    expect(charms.every((o) => getItemCategory(o.id) === 'charm')).toBe(true)

    const weapons = searchCatalogOptions('cestus', 'en', 80, 'weapon')
    expect(weapons.some((o) => o.id === 'WeaponFistTier1')).toBe(true)
  })

  it('catalogIdsByCategory lists all ids of that type', () => {
    const weapons = catalogIdsByCategory('weapon')
    expect(weapons.length).toBeGreaterThan(10)
    expect(weapons.every((id) => getItemCategory(id) === 'weapon')).toBe(true)
    const clues = catalogIdsByCategory('clue')
    expect(clues.some((id) => id.startsWith('Clue_'))).toBe(true)
  })
})
