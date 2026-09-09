import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from 'vue'
import { describe, expect, it } from 'vitest'
import { useWbEditor } from '../../src/games/wanderburg/views/inject'
import type { WanderburgState } from '../../src/games/wanderburg/parse'

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

describe('useWbEditor', () => {
  it('throws WB_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    expect(() => app.runWithContext(() => useWbEditor())).toThrow('WB_EDITOR_INJECT')
  })

  it('reads doc via the state getter and markDirty calls mutate', () => {
    const docA = { silver: 100 }
    const docB = { silver: 200 }
    let current: WanderburgState = {
      relativePath: 'Saves/Playtest/Generation_0001/SaveData.json',
      doc: docA
    }
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (s: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as WanderburgState
    })
    app.runWithContext(() => {
      const ed = useWbEditor()
      expect(ed.save.doc).toBe(docA)
      current = { ...current, doc: docB }
      expect(ed.save.doc).toBe(docB)
      ed.markDirty(() => {
        docB.silver = 999
      })
      expect(mutateCount).toBe(1)
      expect(docB.silver).toBe(999)
    })
  })
})

const electronBridge = ['window', 'api'].join('.')

describe('wanderburg view sources', () => {
  it('has no Electron preload bridge anywhere under src', () => {
    const hits: string[] = []
    for (const file of walkTsAndVue(SRC)) {
      const text = readFileSync(file, 'utf8')
      if (text.includes(electronBridge)) hits.push(file)
    }
    expect(hits).toEqual([])
  })

  it('ResourcesTab lists resource fields and writes via setByPath', () => {
    const text = readFileSync(join(SRC, 'games/wanderburg/views/ResourcesTab.vue'), 'utf8')
    expect(text.includes(electronBridge)).toBe(false)
    expect(text).toMatch(/listResourceFields/)
    expect(text).toMatch(/setByPath/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/el-input-number/)
    expect(text).toMatch(/update:model-value|@update:model-value/)
    expect(text).toMatch(/labelKey/)
    expect(text).toMatch(/wb\.resources\.empty/)
  })

  it('registers UnlockTab backed by the full unlock catalog', () => {
    const indexText = readFileSync(join(SRC, 'games/wanderburg/views/index.ts'), 'utf8')
    expect(indexText).toMatch(/UnlockTab/)
    expect(indexText).toMatch(/resources/)
    const unlockText = readFileSync(join(SRC, 'games/wanderburg/views/UnlockTab.vue'), 'utf8')
    expect(unlockText).toMatch(/listUnlockCatalog/)
    expect(unlockText).toMatch(/setUnlockId|setUnlockedIDsFromCatalog/)
    expect(unlockText).toMatch(/markDirty/)
    expect(unlockText).toMatch(/unlockDisplayName/)
    expect(unlockText).toMatch(/locale/)
    const catalog = JSON.parse(
      readFileSync(join(SRC, 'games/wanderburg/data/unlock-catalog.json'), 'utf8')
    ) as { count: number; catalog: Array<{ nameZh?: string; nameEn?: string }> }
    expect(catalog.count).toBeGreaterThan(50)
    expect(catalog.catalog.length).toBe(catalog.count)
    expect(catalog.catalog.filter((e) => e.nameZh && e.nameZh !== e.nameEn).length).toBeGreaterThan(
      50
    )
  })
})
