import { describe, expect, it } from 'vitest'
import { setLocale } from '@host/i18n'
import { catalogLabel } from '../../src/games/dragon-sword/catalog/index'

describe('catalogLabel', () => {
  it('renders #12345 for unknown CID', () => {
    expect(catalogLabel(12345)).toBe('#12345')
  })

  it('resolves known currency stub by locale', () => {
    expect(catalogLabel(1000001, 'zh')).toBe('Gold')
    expect(catalogLabel(1000001, 'en')).toBe('Gold')
  })

  it('resolves character and title names from imported catalog', () => {
    expect(catalogLabel(10001, 'en')).toBe('Eileen')
    expect(catalogLabel(2100000, 'en')).toBe('Restorer of Grace')
  })

  it('falls back to host locale when omitted', () => {
    setLocale('en')
    expect(catalogLabel(1000002)).toBe('Aether Crystals')
    setLocale('zh')
    // zh currently mirrors EN until local StringData export
    expect(catalogLabel(1000002)).toBe('Aether Crystals')
  })
})
