import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { setLocale } from '@host/i18n'
import { t as tCf, translateError } from '../../src/games/chaos-front/i18n'
import { useCfEditor } from '../../src/games/chaos-front/views/inject'
import { ModuleError } from '@sdk/error'
import type { ChaosFrontState } from '../../src/games/chaos-front/parse'

const SRC = join(__dirname, '../../src')

function walkTsAndVue(dir: string): string[] {
  const out: string[] = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkTsAndVue(p))
    else if (/\.(ts|vue)$/.test(ent.name)) out.push(p)
  }
  return out
}

describe('useCfEditor', () => {
  it('throws CF_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    expect(() => app.runWithContext(() => useCfEditor())).toThrow('CF_EDITOR_INJECT')
  })

  it('reads campaign/collection via the state getter and markDirty calls mutate', () => {
    const campaignA = { tag: 'a' }
    const campaignB = { tag: 'b' }
    const collection = { endings: [false] }
    let current: ChaosFrontState = {
      campaign: campaignA as ChaosFrontState['campaign'],
      collection: collection as ChaosFrontState['collection'],
      slot: 0
    }
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (s: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as ChaosFrontState
    })
    app.provide('savesmithRev', { value: 0 })
    app.runWithContext(() => {
      const ed = useCfEditor()
      expect(ed.save).toBe(campaignA)
      expect(ed.collection).toBe(collection)
      current = { ...current, campaign: campaignB as ChaosFrontState['campaign'] }
      expect(ed.save).toBe(campaignB)
      ed.markDirty(() => {
        collection.endings[0] = true
      })
      expect(mutateCount).toBe(1)
      expect(collection.endings[0]).toBe(true)
    })
  })
})

describe('module i18n', () => {
  const DEEP_KEYS = [
    'resources.credit',
    'planets.warn',
    'formation.hint',
    'units.maxAll',
    'pilots.maxAll',
    'unlock.unlockAllTypes',
    'collection.maxAll',
    'collection.useHostSave',
    'error.ITEM_FULL'
  ] as const

  it('resolves deep CF strings in both locales', () => {
    for (const key of DEEP_KEYS) {
      setLocale('zh')
      expect(tCf(key), key).not.toBe(key)
      setLocale('en')
      expect(tCf(key), key).not.toBe(key)
    }
  })

  it('translateError maps module error codes', () => {
    setLocale('zh')
    expect(translateError(new ModuleError('ITEM_FULL', [4]))).toContain('4')
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

  it('CollectionTab drops independent collection write and uses host save hint', () => {
    const text = readFileSync(join(SRC, 'games/chaos-front/views/CollectionTab.vue'), 'utf8')
    expect(text.includes(electronBridge)).toBe(false)
    expect(text).not.toMatch(/writeCollection|saveCollectionData|saveCol/)
    expect(text).not.toMatch(/collection\.saveFile/)
    expect(text).toMatch(/collection\.useHostSave/)
    expect(text).toMatch(/maxAll/)
    expect(text).toMatch(/markDirty/)
  })
})
