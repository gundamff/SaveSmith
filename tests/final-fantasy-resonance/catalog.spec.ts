import { describe, expect, it } from 'vitest'
import { catalogLabel } from '../../src/games/final-fantasy-resonance/catalog/names'

describe('ffr catalog', () => {
  it('resolves known item and unit names', () => {
    expect(catalogLabel('item', 1, 'en', false)).toMatch(/Potion/i)
    expect(catalogLabel('unit', 1001, 'en', false)).toMatch(/Rain/i)
    expect(catalogLabel('enemy', 1001, 'zh')).toContain('#1001')
    expect(catalogLabel('item', 99999999, 'en')).toBe('#99999999')
  })
})
