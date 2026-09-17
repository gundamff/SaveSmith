import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { setLocale, t as tHost } from '@host/i18n'
import { t as tCg2, translateError } from '../../src/games/chaos-galaxy-2/i18n'
import { useCg2Editor } from '../../src/games/chaos-galaxy-2/views/inject'
import { chaosGalaxy2Views } from '../../src/games/chaos-galaxy-2/views'
import { ModuleError } from '@sdk/error'
import type { ChaosGalaxy2State } from '../../src/games/chaos-galaxy-2/parse'

const SRC = join(__dirname, '../../src')
const VIEWS = join(SRC, 'games/chaos-galaxy-2/views')

function walkTsAndVue(dir: string): string[] {
  const out: string[] = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkTsAndVue(p))
    else if (/\.(ts|vue)$/.test(ent.name)) out.push(p)
  }
  return out
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

describe('useCg2Editor', () => {
  it('throws CG2_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    expect(() => app.runWithContext(() => useCg2Editor())).toThrow('CG2_EDITOR_INJECT')
  })

  it('reads campaign/config via the state getter and markDirty calls mutate', () => {
    const campaignA = { tag: 'a' }
    const campaignB = { tag: 'b' }
    const config = { bits: [false] }
    let current: ChaosGalaxy2State = {
      campaign: campaignA as ChaosGalaxy2State['campaign'],
      config: config as ChaosGalaxy2State['config'],
      slot: 0
    }
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (s: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as ChaosGalaxy2State
    })
    app.provide('savesmithRev', { value: 0 })
    app.runWithContext(() => {
      const ed = useCg2Editor()
      expect(ed.save).toBe(campaignA)
      expect(ed.config).toBe(config)
      current = { ...current, campaign: campaignB as ChaosGalaxy2State['campaign'] }
      expect(ed.save).toBe(campaignB)
      ed.markDirty(() => {
        config.bits[0] = true
      })
      expect(mutateCount).toBe(1)
      expect(config.bits[0]).toBe(true)
      expect(typeof ed.rev).toBe('number')
    })
  })
})

describe('module i18n', () => {
  const DEEP_KEYS = [
    'resources.gold',
    'resources.supply',
    'resources.prestige',
    'resources.maxAll',
    'planets.warn',
    'planets.maxAll',
    'commanders.maxAll',
    'commanders.exp',
    'fleets.commander',
    'fleets.noAdd',
    'unlock.unlockAll',
    'collection.maxAll',
    'collection.useHostSave',
    'error.UNKNOWN_ACTION'
  ] as const

  it('resolves deep CG2 strings in both locales', () => {
    for (const key of DEEP_KEYS) {
      setLocale('zh')
      expect(tCg2(key), key).not.toBe(key)
      setLocale('en')
      expect(tCg2(key), key).not.toBe(key)
    }
  })

  it('translateError maps module error codes', () => {
    setLocale('zh')
    expect(translateError(new ModuleError('UNKNOWN_ACTION', ['nope']))).toContain('nope')
  })
})

const electronBridge = ['window', 'api'].join('.')

describe('ported view sources', () => {
  it('has no Electron preload bridge anywhere under src', () => {
    const hits: string[] = []
    for (const file of walkTsAndVue(SRC)) {
      const text = readFileSync(file, 'utf8')
      if (text.includes(electronBridge)) hits.push(file)
    }
    expect(hits).toEqual([])
  })

  it('registers six tabs with cg2.tabs.* labelKeys and host action strings', () => {
    const text = readFileSync(join(VIEWS, 'index.ts'), 'utf8')
    expect(text).toMatch(/ResourcesTab/)
    expect(text).toMatch(/PlanetsTab/)
    expect(text).toMatch(/CommandersTab/)
    expect(text).toMatch(/FleetsTab/)
    expect(text).toMatch(/UnlockTab/)
    expect(text).toMatch(/CollectionTab/)
    expect(text).toMatch(/cg2\.tabs\.resources/)
    expect(text).toMatch(/cg2\.tabs\.planets/)
    expect(text).toMatch(/cg2\.tabs\.commanders/)
    expect(text).toMatch(/cg2\.tabs\.fleets/)
    expect(text).toMatch(/cg2\.tabs\.unlock/)
    expect(text).toMatch(/cg2\.tabs\.collection/)
    expect(chaosGalaxy2Views.map((v) => v.id)).toEqual([
      'resources',
      'planets',
      'commanders',
      'fleets',
      'unlock',
      'collection'
    ])
    expect(chaosGalaxy2Views.map((v) => v.labelKey)).toEqual([
      'cg2.tabs.resources',
      'cg2.tabs.planets',
      'cg2.tabs.commanders',
      'cg2.tabs.fleets',
      'cg2.tabs.unlock',
      'cg2.tabs.collection'
    ])
    for (const key of [
      'cg2.tabs.resources',
      'cg2.tabs.planets',
      'cg2.tabs.commanders',
      'cg2.tabs.fleets',
      'cg2.tabs.unlock',
      'cg2.tabs.collection',
      'cg2.actions.fillResources',
      'cg2.actions.maxCommanders',
      'cg2.actions.unlockAll',
      'cg2.actions.maxCollection'
    ]) {
      setLocale('zh')
      expect(tHost(key), key).not.toBe(key)
      setLocale('en')
      expect(tHost(key), key).not.toBe(key)
    }
  })

  it('inject uses useSessionBindings with CG2_EDITOR_INJECT', () => {
    const text = readFileSync(join(VIEWS, 'inject.ts'), 'utf8')
    expect(text).toMatch(/useSessionBindings/)
    expect(text).toMatch(/from '@host\/editorBindings'/)
    expect(text).toMatch(/CG2_EDITOR_INJECT/)
    expect(text).toMatch(/trackRev/)
    expect(text).toMatch(/get rev/)
    expect(text).toMatch(/get save/)
    expect(text).toMatch(/get config/)
    expect(text).toMatch(/markDirty/)
  })

  it('ResourcesTab binds resource caps from gameData and writes via markDirty', () => {
    const text = readFileSync(join(VIEWS, 'ResourcesTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/useCg2Editor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/gameData\.resourceMaxGold/)
    expect(text).toMatch(/gameData\.resourceMaxSupply/)
    expect(text).toMatch(/gameData\.resourceMaxPrestige/)
    expect(text).toMatch(/setFactionGold|fillResources/)
    expect(text).toMatch(/markDirty/)
    const blocks = inputNumberBlocks(text)
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).toMatch(/@update:model-value/)
      expect(block).not.toMatch(/@change=/)
      expect(block).toMatch(/:min=/)
      expect(block).toMatch(/:max=/)
    }
  })

  it('CommandersTab edits values only and binds commander caps from gameData', () => {
    const text = readFileSync(join(VIEWS, 'CommandersTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/useCg2Editor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/index/)
    expect(text).toMatch(/el-table/)
    expect(text).toMatch(/PAGE_SIZE/)
    expect(text).toMatch(/pagedCommanders/)
    expect(text).toMatch(/useDeferredReady|v-loading/)
    expect(text).toMatch(/filterMode|filterMine/)
    expect(text).toMatch(/search|searchPlaceholder/)
    expect(text).toMatch(/getCommanderFactionMap|factionName/)
    expect(text).toMatch(/maxAllMine|maxMine/)
    expect(text).toMatch(/gameData\.commanderMaxExp/)
    expect(text).toMatch(/gameData\.commanderMaxStat/)
    expect(text).toMatch(/gameData\.commanderMaxStar/)
    expect(text).toMatch(/setCommander/)
    expect(text).not.toMatch(/addCommander|removeCommander/)
    expect(text).not.toMatch(/listCommanderIds\(\)\.push/)
    expect(text).toMatch(/markDirty/)
    const blocks = inputNumberBlocks(text)
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).toMatch(/@update:model-value/)
      expect(block).not.toMatch(/@change=/)
      expect(block).toMatch(/:min=/)
      expect(block).toMatch(/:max=/)
    }
  })

  it('PlanetsTab snapshots rows and binds planet caps from gameData', () => {
    const text = readFileSync(join(VIEWS, 'PlanetsTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/useCg2Editor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/index/)
    expect(text).toMatch(/el-table/)
    expect(text).toMatch(/gameData\.planetMaxDefense/)
    expect(text).toMatch(/gameData\.planetMaxHqLevel/)
    expect(text).toMatch(/setPlanetField/)
    expect(text).toMatch(/factionOptions/)
    expect(text).toMatch(/el-select/)
    expect(text).toMatch(/markDirty/)
    expect(text).not.toMatch(/:max="99"/)
    const blocks = inputNumberBlocks(text)
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).toMatch(/@update:model-value/)
      expect(block).not.toMatch(/@change=/)
      expect(block).toMatch(/:min=/)
      expect(block).toMatch(/:max=/)
    }
  })

  it('FleetsTab edits existing slots only and has no add/delete UI', () => {
    const text = readFileSync(join(VIEWS, 'FleetsTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/useCg2Editor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/index/)
    expect(text).toMatch(/fleet-card|fleet-list/)
    expect(text).toMatch(/setFleetUnit|setFleetCommander/)
    expect(text).toMatch(/unitOptions/)
    // OOM guard: do not mount full option lists for every row at once
    expect(text).toMatch(/PAGE_SIZE/)
    expect(text).toMatch(/pagedFleets/)
    expect(text).toMatch(/visibleOptions|openSelectKey/)
    expect(text).toMatch(/unit-block|unit-stats|unit-grid/)
    expect(text).toMatch(/filterMode/)
    expect(text).toMatch(/useDeferredReady|v-loading/)
    expect(text).toMatch(/factionOptions|factionOpts/)
    expect(text).not.toMatch(/addFleet|removeFleet|deleteFleet/)
    expect(text).not.toMatch(/setFleetUnit\([^)]+,\s*14/)
    expect(text).toMatch(/markDirty/)
    const blocks = inputNumberBlocks(text)
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).toMatch(/@update:model-value/)
      expect(block).not.toMatch(/@change=/)
      expect(block).toMatch(/:min=/)
      expect(block).toMatch(/:max=/)
    }
  })

  it('UnlockTab toggles existing Faction unlock keys via markDirty', () => {
    const text = readFileSync(join(VIEWS, 'UnlockTab.vue'), 'utf8')
    const body = templateBody(text).trim()
    expect(body).toMatch(/^<div\b/)
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
    expect(text).toMatch(/useCg2Editor/)
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/unlockAllKnown/)
    expect(text).toMatch(/Unlocked/)
    expect(text).toMatch(/alienLabel|AlienUnlocked/)
    expect(text).toMatch(/unlock\.hint|alienHint/)
    expect(text).toMatch(/markDirty/)
  })

  it('CollectionTab drops independent collection write and uses host save hint', () => {
    const text = readFileSync(join(VIEWS, 'CollectionTab.vue'), 'utf8')
    expect(text.includes(electronBridge)).toBe(false)
    expect(text).not.toMatch(/writeCollection|saveCollectionData|saveCol/)
    expect(text).not.toMatch(/collection\.saveFile/)
    expect(text).toMatch(/collection\.useHostSave/)
    expect(text).toMatch(/maxAll/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/setCollectionBit|maxAllCollections/)
    const body = templateBody(text).trim()
    expect(body).toMatch(/:data-ss-rev="editor\.rev"/)
  })
})
