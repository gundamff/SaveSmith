import { describe, expect, it } from 'vitest'
import { headOptions, outfitOptions } from '../../src/games/dead-cells/model/skins'

describe('dead-cells skins catalog', () => {
  it('lists outfits with localized names', () => {
    const zh = outfitOptions('zh')
    expect(zh.length).toBeGreaterThan(100)
    const classic = zh.find((o) => o.value === 'PrisonerDefault')
    expect(classic?.label).toBe('经典装束')
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
})
