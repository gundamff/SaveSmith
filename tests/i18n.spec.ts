import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModuleError } from '@sdk/error'
import { locale, setLocale, t, translateError } from '@host/i18n'

const REQUIRED_KEYS = [
  'app.brandZh',
  'app.tagline',
  'library.title',
  'library.subtitle',
  'library.detected',
  'library.missing',
  'library.chooseDir',
  'library.openGame',
  'library.store',
  'library.unrecognized',
  'nav.about',
  'nav.langZh',
  'nav.langEn',
  'editor.quitGame',
  'editor.saveDir',
  'editor.currentSlot',
  'editor.noSlot',
  'slots.savedAt',
  'about.disclaimer',
  'backups.delete',
  'backups.deleteConfirm',
  'backups.deleteFailed',
  'backups.target',
  'error.EMPTY_SERIALIZE',
  'error.UNKNOWN_ACTION',
  'error.URL_NOT_ALLOWED',
  'error.MISSING_FIELD',
  'error.DEPLOYED_NO_PILOT',
  'error.PILOT_TAKEN',
  'error.UNIT_INDEX',
  'cf.actions.fillResources',
  'cf.actions.maxUnits',
  'cf.actions.maxPilots',
  'cf.actions.unlockAll',
  'cf.actions.maxCollection',
  'cf.tabs.resources',
  'cf.tabs.planets',
  'cf.tabs.formation',
  'cf.tabs.units',
  'cf.tabs.pilots',
  'cf.tabs.unlock',
  'cf.tabs.collection',
  'wb.tabs.resources',
  'wb.resources.silver',
  'wb.resources.silverBeforeLastRun',
  'wb.resources.empty',
  'te.tabs.character',
  'te.tabs.inventory',
  'te.character.name',
  'te.character.fillMax',
  'te.inventory.hotbar',
  'error.UNSUPPORTED_VERSION',
  'error.INVALID_NAME',
  'error.INVALID_SILVER',
  'error.LIFE_OVER_MAX',
  'error.MANA_OVER_MAX'
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

  it('translateError uses error.{code} when present', () => {
    setLocale('zh')
    expect(translateError(new ModuleError('UNKNOWN_ACTION', ['fill']))).toBe('未知动作：fill')
    expect(translateError(new ModuleError('EMPTY_SERIALIZE', []))).not.toBe('EMPTY_SERIALIZE')
    expect(translateError(new Error('raw'))).toBe('raw')
  })

  it('about.disclaimer interpolates the rights holder', () => {
    setLocale('zh')
    const zh = t('about.disclaimer', 'ChaosGalaxyStudio')
    expect(zh).toContain('ChaosGalaxyStudio')
    expect(zh).toContain('非官方')
    expect(zh).toContain('单机')
    expect(zh).toContain('联机')
    setLocale('en')
    const en = t('about.disclaimer', 'ChaosGalaxyStudio')
    expect(en).toContain('ChaosGalaxyStudio')
    expect(en.toLowerCase()).toContain('unofficial')
    expect(en.toLowerCase()).toContain('offline')
    expect(en.toLowerCase()).toContain('online')
  })
})
