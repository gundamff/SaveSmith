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
  'editor.busyParse',
  'editor.busySave',
  'editor.busyView',
  'editor.backups',
  'slots.savedAt',
  'about.disclaimer',
  'about.disclaimerGeneric',
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
  'ds.tabs.currency',
  'ds.tabs.items',
  'ds.tabs.characters',
  'ds.tabs.team',
  'ds.tabs.equipment',
  'ds.tabs.cooking',
  'ds.tabs.unlock',
  'ds.tabs.cosmetics',
  'ds.tabs.world',
  'ds.cidHint',
  'ds.cidHintLink',
  'ds.actions.maxCurrency',
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
  'error.INVALID_AMOUNT',
  'error.INVALID_STACK',
  'error.INVALID_POSITION',
  'error.UNKNOWN_TEAM_CID',
  'error.COLLECTION_LENGTH',
  'error.LIFE_OVER_MAX',
  'error.MANA_OVER_MAX',
  'dc.tabs.resources',
  'dc.tabs.blueprints',
  'dc.tabs.runes',
  'dc.tabs.unlock',
  'dc.unlock.cat.all',
  'dc.unlock.cat.weapons',
  'dc.unlock.cat.skins',
  'dc.unlock.unlocked',
  'dc.resources.deathMoney',
  'dc.resources.deathCells',
  'dc.resources.heroSkin',
  'dc.resources.bossCells',
  'dc.difficulty.normal',
  'dc.difficulty.hell',
  'dc.bossRush.basementUnlock',
  'dc.bossRush.unlockedGameMode',
  'dc.blueprints.itemId',
  'dc.blueprints.name',
  'dc.runes.name',
  'dc.runes.unlockAll',
  'pbz.tabs.resources',
  'pbz.resources.warning',
  'pbz.resources.slot',
  'pbz.resources.slotDirty',
  'pbz.resources.dust',
  'pbz.resources.weaponMaterials',
  'pbz.resources.consumables',
  'pbz.resources.addItem',
  'pbz.resources.addTitle',
  'pbz.resources.addSearchPlaceholder',
  'pbz.resources.amount',
  'pbz.resources.cancel',
  'pbz.resources.confirm',
  'pbz.resources.addExistingHint',
  'pbz.resources.addNewHint',
  'pbz.resources.thresholdRiskHint',
  'pbz.resources.delete',
  'pbz.resources.deleteTitle',
  'pbz.resources.deleteConfirm',
  'pbz.resources.actions',
  'pbz.resources.materials',
  'pbz.resources.filterPlaceholder',
  'pbz.resources.setAll9999',
  'pbz.resources.empty',
  'pbz.resources.name',
  'pbz.resources.id',
  'pbz.resources.current',
  'pbz.resources.max',
  'pbz.resources.target',
  'pbz.resources.materialName',
  'pbz.resources.unknownItem',
  'error.PBZ_INVALID_BLOCK',
  'error.PBZ_AUTH_FAILED',
  'error.PBZ_INVALID_CONTAINER',
  'error.PBZ_UNSUPPORTED_COMPRESSION',
  'error.PBZ_DECOMPRESSION_FAILED',
  'error.PBZ_SLOT_READ_ONLY',
  'error.PBZ_INVALID_JSON',
  'error.PBZ_INVALID_EDIT',
  'error.PBZ_NO_EDITABLE_SLOTS',
  'error.PBZ_INVALID_SLOT',
  'error.PBZ_DUPLICATE_SLOT',
  'error.PBZ_INVALID_SELECTION',
  'error.PBZ_INVALID_DOCUMENT',
  'error.PBZ_INVALID_PLAYER',
  'error.PBZ_INVALID_DUST',
  'error.PBZ_INVALID_INVENTORY',
  'error.PBZ_INVALID_INVENTORY_INFOS',
  'error.PBZ_INVALID_MATERIAL',
  'error.PBZ_INVALID_MATERIAL_AMOUNT',
  'error.PBZ_INVALID_MATERIAL_MAX'
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

  it('interpolates the PBZ generic material name in both locales', () => {
    setLocale('zh')
    expect(t('pbz.resources.materialName', '01')).toBe('材料 01')
    setLocale('en')
    expect(t('pbz.resources.materialName', '01')).toBe('Material 01')
  })

  it('uses the verified Dust copy in both locales', () => {
    setLocale('zh')
    expect(t('pbz.resources.dust')).toBe('意识尘埃')
    setLocale('en')
    expect(t('pbz.resources.dust')).toBe('Dust')
    expect(t('pbz.resources.dust')).not.toBe('Dust field')
  })

  it('uses category-neutral item filtering copy', () => {
    setLocale('zh')
    expect(t('pbz.resources.filterPlaceholder')).toBe('按物品名称或原始 ID 筛选')
    expect(t('pbz.resources.empty')).toBe('没有已有物品或筛选无结果')
    setLocale('en')
    expect(t('pbz.resources.filterPlaceholder')).toBe('Filter by item name or raw ID')
    expect(t('pbz.resources.empty')).toBe('No existing items or no filter matches')
  })

  it('translateError uses error.{code} when present', () => {
    setLocale('zh')
    expect(translateError(new ModuleError('UNKNOWN_ACTION', ['fill']))).toBe('未知动作：fill')
    expect(translateError(new ModuleError('EMPTY_SERIALIZE', []))).not.toBe('EMPTY_SERIALIZE')
    expect(translateError(new Error('raw'))).toBe('raw')
  })

  it('about.disclaimer interpolates rights holder and game name', () => {
    setLocale('zh')
    const zh = t('about.disclaimer', 'ChaosGalaxyStudio', '混沌兵团')
    expect(zh).toContain('ChaosGalaxyStudio')
    expect(zh).toContain('混沌兵团')
    expect(zh).toContain('非官方')
    expect(zh).toContain('单机')
    expect(zh).toContain('联机')
    expect(zh).not.toContain('SaveSmith')
    setLocale('en')
    const en = t('about.disclaimer', 'ChaosGalaxyStudio', 'Chaos Front')
    expect(en).toContain('ChaosGalaxyStudio')
    expect(en).toContain('Chaos Front')
    expect(en.toLowerCase()).toContain('unofficial')
    expect(en.toLowerCase()).toContain('offline')
    expect(en.toLowerCase()).toContain('online')
    expect(en).not.toContain('SaveSmith')
  })

  it('about.disclaimerGeneric is the About dialog copy for all games', () => {
    setLocale('zh')
    const zh = t('about.disclaimerGeneric')
    expect(zh).toContain('各游戏官方')
    expect(zh).toContain('非官方')
    expect(zh).toContain('单机')
    expect(zh).toContain('联机')
    expect(zh).not.toContain('SaveSmith')
    expect(zh).not.toContain('存档酱')
    expect(zh).not.toContain('HOUND13')
    expect(zh).not.toContain('龙之剑')
    setLocale('en')
    const en = t('about.disclaimerGeneric')
    expect(en.toLowerCase()).toContain('unofficial')
    expect(en.toLowerCase()).toContain('any game')
    expect(en.toLowerCase()).toContain('offline')
    expect(en.toLowerCase()).toContain('online')
    expect(en).not.toContain('SaveSmith')
    expect(en).not.toContain('HOUND13')
  })
})
