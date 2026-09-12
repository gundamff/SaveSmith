import { describe, expect, it } from 'vitest'
import { setLocale } from '@host/i18n'
import { catalogLabel } from '../../src/games/dragon-sword/catalog/index'

describe('catalogLabel', () => {
  it('renders #12345 for unknown CID', () => {
    expect(catalogLabel(12345)).toBe('#12345')
  })

  it('resolves known currency by locale', () => {
    expect(catalogLabel(1000001, 'zh')).toBe('金币')
    expect(catalogLabel(1000001, 'en')).toBe('Gold')
  })

  it('resolves character and title names from imported catalog', () => {
    expect(catalogLabel(10001, 'zh')).toBe('艾琳')
    expect(catalogLabel(10001, 'en')).toBe('Eileen')
    expect(catalogLabel(2100000, 'zh')).toBe('恩泽的修复者')
    expect(catalogLabel(2100000, 'en')).toBe('Restorer of Grace')
  })

  it('falls back to host locale when omitted', () => {
    setLocale('en')
    expect(catalogLabel(1000002)).toBe('Aether Crystals')
    setLocale('zh')
    expect(catalogLabel(1000002)).toBe('以太晶体')
  })
})
