import { describe, expect, it } from 'vitest'
import { catalogLabel } from '../../src/games/final-fantasy-resonance/catalog/names'

describe('ffr catalog', () => {
  it('resolves known item and unit names', () => {
    expect(catalogLabel('item', 1, 'en', false)).toMatch(/Potion/i)
    expect(catalogLabel('unit', 1001, 'en', false)).toMatch(/Rain/i)
    expect(catalogLabel('unit', 1001, 'zh', false)).toBe('雷因')
    expect(catalogLabel('item', 1, 'zh', false)).toBe('恢复药')
    expect(catalogLabel('item', 12015, 'zh', false)).toBe('铁木履')
    expect(catalogLabel('item', 13113, 'zh', false)).toBe('赛菲罗斯')
    expect(catalogLabel('enemy', 1001, 'zh')).toContain('雷因')
    expect(catalogLabel('item', 99999999, 'en')).toBe('#99999999')
  })

  it('zh locale never surfaces kana as chinese for overlayed items', () => {
    for (const id of [1, 12015, 25004, 10105, 13110]) {
      expect(catalogLabel('item', id, 'zh', false)).not.toMatch(/[\u3040-\u30ff]/)
    }
  })
})
