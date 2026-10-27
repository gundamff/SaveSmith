import { describe, expect, it } from 'vitest'
import { catalogLabel } from '../../src/games/final-fantasy-resonance/catalog/names'

describe('ffr classic FF zh from EN', () => {
  it('maps wiki-style English equipment to classic Simplified Chinese', () => {
    expect(catalogLabel('item', 10101, 'zh', false)).toBe('青铜剑')
    expect(catalogLabel('item', 10106, 'zh', false)).toBe('冰印剑')
    expect(catalogLabel('item', 10200, 'zh', false)).toBe('紫电')
    expect(catalogLabel('item', 500, 'zh', false)).toBe('帐篷')
    expect(catalogLabel('item', 10199, 'zh', false)).toBe('诸神黄昏')
  })

  it('keeps retail-verified consumable wording', () => {
    expect(catalogLabel('item', 1, 'zh', false)).toBe('恢复药')
    expect(catalogLabel('item', 12015, 'zh', false)).toBe('铁木履')
  })
})
