import { describe, expect, it } from 'vitest'
import {
  categoryIds,
  headOptions,
  outfitOptions,
  UNLOCK_CATEGORIES
} from '../../src/games/dead-cells/model/catalog'

describe('dead-cells unlock catalog', () => {
  it('lists outfits with localized names for the dropdowns', () => {
    const zh = outfitOptions('zh')
    expect(zh.length).toBeGreaterThan(100)
    expect(zh.find((o) => o.value === 'PrisonerDefault')?.label).toBe('经典装束')
    const en = outfitOptions('en')
    expect(en.find((o) => o.value === 'PrisonerDefault')?.label).toBe('Classic Outfit')
  })

  it('lists head skins with localized names', () => {
    const zh = headOptions('zh')
    expect(zh.length).toBeGreaterThan(20)
    expect(zh.find((o) => o.value === 'BaseFlame')?.label).toBe('经典脑袋')
  })

  it('keeps an unknown current value selectable', () => {
    const opts = outfitOptions('zh', 'NotARealSkin')
    expect(opts[0]?.value).toBe('NotARealSkin')
    expect(opts.some((o) => o.value === 'PrisonerDefault')).toBe(true)
  })

  it('exposes unlockable categories with real items', () => {
    const all = categoryIds('all')
    expect(all.length).toBeGreaterThan(400)
    // no duplicates across categories
    expect(new Set(all).size).toBe(all.length)
    for (const cat of UNLOCK_CATEGORIES) expect(categoryIds(cat).length).toBeGreaterThan(0)
    // spot checks
    expect(categoryIds('weapons')).toContain('QuickSword')
    expect(categoryIds('mutations')).toContain('P_Bleed')
    expect(categoryIds('aspects')).toContain('ASP_Berzerker')
    expect(categoryIds('skins')).toContain('PrisonerGold')
    expect(categoryIds('heads')).toContain('BaseFlame')
    expect(categoryIds('meta')).toContain('Flask1')
    // runes / boss cells live in their own tabs, not the unlock catalog
    expect(categoryIds('all')).not.toContain('LadderKey')
    expect(categoryIds('all')).not.toContain('BossRune1')
  })
})
