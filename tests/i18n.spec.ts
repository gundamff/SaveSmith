import { afterEach, describe, expect, it, vi } from 'vitest'
import { locale, setLocale, t } from '@host/i18n'

const REQUIRED_KEYS = [
  'library.title',
  'library.detected',
  'library.missing',
  'library.chooseDir',
  'library.openGame',
  'library.store',
  'library.unrecognized',
  'nav.about',
  'nav.langZh',
  'nav.langEn'
] as const

afterEach(() => {
  setLocale('zh')
  vi.unstubAllGlobals()
})

describe('host i18n', () => {
  it('uses Chinese catalog by default and interpolates {0}', () => {
    setLocale('zh')
    expect(t('library.title')).toBe('游戏库')
    expect(t('library.detected')).toBe('已找到存档目录')
    expect(t('library.missing')).toBe('未找到，请手动选择')
    expect(t('library.chooseDir')).toBe('选择存档目录')
    expect(t('library.openGame')).toBe('打开')
    expect(t('library.store')).toBe('商店页')
    expect(t('library.unrecognized')).toBe('此目录不是该游戏的存档')
    expect(t('nav.about')).toBe('关于')
    expect(t('nav.langZh')).toBe('中文')
    expect(t('nav.langEn')).toBe('English')
    expect(t('library.title', 'unused')).toBe('游戏库')
  })

  it('switches to English catalog', () => {
    setLocale('en')
    expect(locale.value).toBe('en')
    expect(t('library.title')).not.toBe('游戏库')
    expect(t('library.title')).not.toBe('library.title')
    expect(t('nav.about')).not.toBe('关于')
    expect(t('nav.langEn')).toBe('English')
  })

  it('fills both locale trees for every required key', () => {
    for (const key of REQUIRED_KEYS) {
      setLocale('zh')
      expect(t(key), key).not.toBe(key)
      setLocale('en')
      expect(t(key), key).not.toBe(key)
    }
  })

  it('persists locale under savesmith-locale', () => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
      key: () => null,
      length: 0
    })
    setLocale('en')
    expect(store['savesmith-locale']).toBe('en')
    setLocale('zh')
    expect(store['savesmith-locale']).toBe('zh')
  })

  it('interpolates numbered placeholders on the resolved string', () => {
    expect(t('hello {0}', 'world')).toBe('hello world')
  })
})
