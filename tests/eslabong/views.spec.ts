import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { setLocale, t } from '@host/i18n'
import { useEsEditor } from '../../src/games/eslabong/views/inject'
import type { EslabongState } from '../../src/games/eslabong/parse'

const SRC = join(__dirname, '../../src')
const VIEWS = join(SRC, 'games/eslabong/views')

function walkTsAndVue(dir: string): string[] {
  const out: string[] = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkTsAndVue(p))
    else if (/\.(ts|vue)$/.test(ent.name)) out.push(p)
  }
  return out
}

describe('useEsEditor', () => {
  it('throws ES_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    expect(() => app.runWithContext(() => useEsEditor())).toThrow('ES_EDITOR_INJECT')
  })

  it('reads save via the state getter and markDirty calls mutate', () => {
    const clubA = { gold: 1, renown: 2, developmentStars: 3, highestRenownReached: 2 }
    const clubB = { gold: 9, renown: 2, developmentStars: 3, highestRenownReached: 2 }
    let current = {
      club: clubA,
      fighters: [],
      items: [],
      writeEnabled: true,
      sidecar: {}
    } as unknown as EslabongState
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (s: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as EslabongState
    })
    app.provide('savesmithRev', { value: 0 })
    app.runWithContext(() => {
      const ed = useEsEditor()
      expect(ed.save.club).toBe(clubA)
      current = { ...current, club: clubB }
      expect(ed.save.club).toBe(clubB)
      ed.markDirty(() => {
        clubB.gold = 42
      })
      expect(mutateCount).toBe(1)
      expect(clubB.gold).toBe(42)
    })
  })
})

const electronBridge = ['window', 'api'].join('.')

describe('eslabong view sources', () => {
  it('has no Electron preload bridge under eslabong views', () => {
    const hits: string[] = []
    for (const file of walkTsAndVue(VIEWS)) {
      const text = readFileSync(file, 'utf8')
      if (text.includes(electronBridge)) hits.push(file)
    }
    expect(hits).toEqual([])
  })

  it('registers Overview / Fighters / Items tabs', () => {
    const text = readFileSync(join(VIEWS, 'index.ts'), 'utf8')
    expect(text).toMatch(/OverviewTab/)
    expect(text).toMatch(/FightersTab/)
    expect(text).toMatch(/ItemsTab/)
    expect(text).toMatch(/es\.tabs\.overview/)
    expect(text).toMatch(/es\.tabs\.fighters/)
    expect(text).toMatch(/es\.tabs\.items/)
  })

  it('inject uses useSessionBindings with markDirty', () => {
    const text = readFileSync(join(VIEWS, 'inject.ts'), 'utf8')
    expect(text).toMatch(/useSessionBindings/)
    expect(text).toMatch(/ES_EDITOR_INJECT/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/trackRev/)
    expect(text).toMatch(/get rev/)
  })

  it('OverviewTab edits club gold/renown/stars and depends on editor.rev', () => {
    const text = readFileSync(join(VIEWS, 'OverviewTab.vue'), 'utf8')
    expect(text).toMatch(/void editor\.rev|:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/el-input-number/)
    expect(text).toMatch(/@update:model-value/)
    expect(text).toMatch(/markDirty|useRevSyncedNumber/)
    expect(text).toMatch(/club\.gold|onGold/)
    expect(text).toMatch(/renown/)
    expect(text).toMatch(/developmentStars/)
    expect(text).toMatch(/writeEnabled/)
    expect(text).not.toMatch(/@change=/)
  })

  it('FightersTab lists fighters with whitelist editors and skill selects', () => {
    const text = readFileSync(join(VIEWS, 'FightersTab.vue'), 'utf8')
    expect(text).toMatch(/void editor\.rev|:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/collectCatalog|catalog\.skills/)
    expect(text).toMatch(/clearInjury/)
    expect(text).toMatch(/maxProgress/)
    expect(text).toMatch(/el-input-number/)
    expect(text).toMatch(/@update:model-value/)
    expect(text).toMatch(/skills/)
    expect(text).toMatch(/personality|aiProfile|birth|career/)
    expect(text).toMatch(/profession|classLabel/)
    expect(text).toMatch(/fieldLabel/)
    expect(text).toMatch(/draft/)
    expect(text).toMatch(/GROWTH_STYLE_OPTIONS|growthStyleOptions/)
    expect(text).toMatch(/multiple/)
    expect(text).toMatch(/equipped|buildEquippedDraft/)
    expect(text).toMatch(/fighterFieldBounds|clampFighterField|itemStatBounds/)
    expect(text).toMatch(/definitionLabel/)
  })

  it('ItemsTab lists items with quality and stats editors', () => {
    const text = readFileSync(join(VIEWS, 'ItemsTab.vue'), 'utf8')
    expect(text).toMatch(/void editor\.rev|:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/collectCatalog|catalog\.(qualities|statIds|definitions)/)
    expect(text).toMatch(/definitionLabel|formatStatsSummary/)
    expect(text).toMatch(/stats/)
    expect(text).toMatch(/el-input-number/)
    expect(text).toMatch(/@update:model-value/)
    expect(text).toMatch(/itemStatBounds|clampItemStatAmount/)
    expect(text).not.toMatch(/instanceId/)
  })
})

describe('eslabong i18n keys', () => {
  const KEYS = [
    'es.tabs.overview',
    'es.tabs.fighters',
    'es.tabs.items',
    'es.overview.gold',
    'es.overview.renown',
    'es.overview.developmentStars',
    'es.overview.writeDisabled',
    'es.overview.quitNotice',
    'es.fighters.empty',
    'es.fighters.profession',
    'es.fighters.level',
    'es.fighters.growthStylesHint',
    'es.fighters.skillSlot',
    'es.fighters.clearInjury',
    'es.fighters.maxProgress',
    'es.fighters.equipped',
    'es.fighters.equippedSlot',
    'es.fighters.equippedEmpty',
    'es.items.empty',
    'es.items.quality',
    'es.items.statId',
    'es.items.amount'
  ] as const

  it('resolves Task 8 keys in both locales', () => {
    for (const key of KEYS) {
      setLocale('zh')
      expect(t(key), key).not.toBe(key)
      setLocale('en')
      expect(t(key), key).not.toBe(key)
    }
  })
})
