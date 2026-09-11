import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { setLocale, t as tHost } from '@host/i18n'
import { t as tDs } from '../../src/games/dragon-sword/i18n'
import { dragonSwordModule } from '../../src/games/dragon-sword'
import { useDsEditor } from '../../src/games/dragon-sword/views/inject'
import type { DragonSwordState } from '../../src/games/dragon-sword/parse'

const SRC = join(__dirname, '../../src')
const VIEWS = join(SRC, 'games/dragon-sword/views')

function walkTsAndVue(dir: string): string[] {
  const out: string[] = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkTsAndVue(p))
    else if (/\.(ts|vue)$/.test(ent.name)) out.push(p)
  }
  return out
}

function dummySave(partial: Partial<DragonSwordState> = {}): DragonSwordState {
  return {
    relativePath: '1/1_Slot1.db',
    salt: new Uint8Array(16),
    plaintextBase: new Uint8Array(4096),
    userDbid: '1',
    currencies: [{ itemCid: 1000001, amount: 10 }],
    stackables: [{ itemCid: 2000001, stackCnt: 3 }],
    characters: [],
    teams: [],
    equipment: [],
    cookItems: [],
    switches: [],
    titles: [],
    karma: [],
    costumes: [],
    vehicles: [],
    equipMounts: [],
    user: { regionCid: 0, sectionUid: '0', posX: 0, posY: 0, posZ: 0 },
    ...partial
  }
}

function templateBody(vue: string): string {
  const start = vue.indexOf('<template>')
  const style = vue.search(/<style[\s>]/)
  const endSearch = style === -1 ? vue.length : style
  const end = vue.lastIndexOf('</template>', endSearch)
  if (start < 0 || end < 0) return ''
  return vue.slice(start + '<template>'.length, end)
}

function inputNumberBlocks(text: string): string[] {
  return text.match(/<el-input-number[\s\S]*?\/>/g) ?? []
}

describe('useDsEditor', () => {
  it('throws DS_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    expect(() => app.runWithContext(() => useDsEditor())).toThrow('DS_EDITOR_INJECT')
  })

  it('reads save via the state getter and markDirty calls mutate', () => {
    const currenciesA = [{ itemCid: 1, amount: 10 }]
    const currenciesB = [{ itemCid: 1, amount: 20 }]
    let current = dummySave({ currencies: currenciesA })
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (s: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as DragonSwordState
    })
    app.provide('savesmithRev', { value: 0 })
    app.runWithContext(() => {
      const ed = useDsEditor()
      expect(ed.save.currencies).toBe(currenciesA)
      current = dummySave({ currencies: currenciesB })
      expect(ed.save.currencies).toBe(currenciesB)
      ed.markDirty(() => {
        currenciesB[0]!.amount = 999
      })
      expect(mutateCount).toBe(1)
      expect(currenciesB[0]!.amount).toBe(999)
      expect(typeof ed.rev).toBe('number')
    })
  })
})

describe('module i18n', () => {
  const DEEP_KEYS = [
    'currency.empty',
    'currency.cid',
    'currency.amount',
    'currency.maxAll',
    'items.empty',
    'items.cid',
    'items.stack',
    'items.add',
    'items.addCid'
  ] as const

  it('resolves deep DS strings in both locales', () => {
    for (const key of DEEP_KEYS) {
      setLocale('zh')
      expect(tDs(key), key).not.toBe(key)
      setLocale('en')
      expect(tDs(key), key).not.toBe(key)
    }
  })
})

describe('max-currency action', () => {
  it('raises every currency amount to the module cap', () => {
    const state = dummySave({
      currencies: [
        { itemCid: 1, amount: 1 },
        { itemCid: 2, amount: 50 }
      ]
    })
    const ids = dragonSwordModule.actions(state).map((a) => a.id)
    expect(ids).toContain('max-currency')
    const next = dragonSwordModule.applyAction(state, 'max-currency')
    expect(next.currencies.every((row) => row.amount === 99_999_999)).toBe(true)
  })
})

const electronBridge = ['window', 'api'].join('.')

describe('dragon-sword view sources', () => {
  it('has no Electron preload bridge anywhere under src', () => {
    const hits: string[] = []
    for (const file of walkTsAndVue(SRC)) {
      const text = readFileSync(file, 'utf8')
      if (text.includes(electronBridge)) hits.push(file)
    }
    expect(hits).toEqual([])
  })

  it('inject uses useSessionBindings like wanderburg', () => {
    const text = readFileSync(join(VIEWS, 'inject.ts'), 'utf8')
    expect(text).toMatch(/useSessionBindings/)
    expect(text).toMatch(/from '@host\/editorBindings'/)
    expect(text).toMatch(/DS_EDITOR_INJECT/)
    expect(text).toMatch(/trackRev/)
    expect(text).toMatch(/get rev/)
    expect(text).toMatch(/get save/)
    expect(text).toMatch(/markDirty/)
  })

  it('registers currency and items tabs with ds.tabs.* labelKeys', () => {
    const text = readFileSync(join(VIEWS, 'index.ts'), 'utf8')
    expect(text).toMatch(/CurrencyTab/)
    expect(text).toMatch(/ItemsTab/)
    expect(text).toMatch(/ds\.tabs\.currency/)
    expect(text).toMatch(/ds\.tabs\.items/)
    expect(tHost('ds.tabs.currency')).not.toBe('ds.tabs.currency')
    expect(tHost('ds.tabs.items')).not.toBe('ds.tabs.items')
    expect(tHost('ds.actions.maxCurrency')).not.toBe('ds.actions.maxCurrency')
  })

  it('CurrencyTab is a single root with snapshot rows and InputNumber @update:model-value', () => {
    const text = readFileSync(join(VIEWS, 'CurrencyTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(body).toMatch(/<\/div>\s*$/)
    expect(text).toMatch(/useDsEditor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/index/)
    expect(text).toMatch(/el-table/)
    expect(text).not.toMatch(/:data="editor\.save\.currencies"/)
    const blocks = inputNumberBlocks(text)
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).toMatch(/@update:model-value/)
      expect(block).not.toMatch(/@change=/)
    }
    expect(text).toMatch(/markDirty/)
  })

  it('ItemsTab is a single root with snapshot rows and stack InputNumber @update:model-value', () => {
    const text = readFileSync(join(VIEWS, 'ItemsTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(body).toMatch(/<\/div>\s*$/)
    expect(text).toMatch(/useDsEditor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/index/)
    expect(text).toMatch(/el-table/)
    expect(text).not.toMatch(/:data="editor\.save\.stackables"/)
    const blocks = inputNumberBlocks(text)
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).toMatch(/@update:model-value/)
      expect(block).not.toMatch(/@change=/)
    }
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/stackables/)
  })
})
