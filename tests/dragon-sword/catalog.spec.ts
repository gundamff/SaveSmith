import { describe, expect, it } from 'vitest'
import { setLocale } from '@host/i18n'
import { catalogLabel } from '../../src/games/dragon-sword/catalog/index'

describe('catalogLabel', () => {
  it('renders #12345 for unknown CID', () => {
    expect(catalogLabel(12345)).toBe('#12345')
  })

  it('resolves known currency stub by locale', () => {
    expect(catalogLabel(1000001, 'zh')).toBe('金币')
    expect(catalogLabel(1000001, 'en')).toBe('Gold')
  })

  it('falls back to host locale when omitted', () => {
    setLocale('en')
    expect(catalogLabel(1000002)).toBe('Diamond')
    setLocale('zh')
    expect(catalogLabel(1000002)).toBe('钻石')
  })
})
