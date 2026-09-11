import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetSessionIo, setSessionIo, useSessionStore } from '@host/stores/session'
import { dummyModule } from './dummyModule'

const ROOT = join(__dirname, '..')
const enc = (s: string) => new TextEncoder().encode(s)

beforeEach(() => {
  setActivePinia(createPinia())
  resetSessionIo()
})

afterEach(() => {
  resetSessionIo()
})

describe('markRaw in-place edit reactivity', () => {
  it('mutate on in-place markRaw tree increments revision (InputNumber re-bind contract)', async () => {
    setSessionIo({
      async listDirNames() {
        return ['save.txt']
      },
      async readFileBytes() {
        return enc('1')
      },
      async writeAtomic() {
        return 'bak'
      },
      async listBackups() {
        return []
      },
      async restoreBackup() {},
      async deleteBackup() {}
    })
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    const before = store.revision
    store.mutate((s) => {
      ;(s as { gold: number }).gold += 5
      return s
    })
    expect(store.revision).toBe(before + 1)
    expect((store.state as { gold: number }).gold).toBe(6)
  })

  it('EditorPage provides savesmithRev and passes data-ss-rev into the active view', () => {
    const text = readFileSync(join(ROOT, 'src/host/components/EditorPage.vue'), 'utf8')
    expect(text).toMatch(/provide\(\s*['"]savesmithRev['"]/)
    expect(text).toMatch(/:data-ss-rev="store\.revision"/)
  })

  it('session store bumps revision from mutate and runAction', () => {
    const text = readFileSync(join(ROOT, 'src/host/stores/session.ts'), 'utf8')
    expect(text).toMatch(/revision\.value\+\+/g)
    expect(text).toMatch(/const revision = ref\(0\)/)
  })

  it('game editor injects require savesmithRev via useSessionBindings', () => {
    for (const rel of [
      'src/games/chaos-front/views/inject.ts',
      'src/games/wanderburg/views/inject.ts',
      'src/games/terraria/views/inject.ts'
    ]) {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      expect(text, rel).toMatch(/useSessionBindings/)
      expect(text, rel).toMatch(/trackRev/)
      expect(text, rel).toMatch(/get rev/)
    }
  })

  it('tabs that bind markRaw fields/lists depend on editor.rev', () => {
    const files = [
      'src/games/chaos-front/views/ResourcesTab.vue',
      'src/games/chaos-front/views/UnitsTab.vue',
      'src/games/chaos-front/views/PilotsTab.vue',
      'src/games/chaos-front/views/PlanetsTab.vue',
      'src/games/chaos-front/views/FormationTab.vue',
      'src/games/chaos-front/views/UnlockTab.vue',
      'src/games/chaos-front/views/CollectionTab.vue',
      'src/games/wanderburg/views/ResourcesTab.vue',
      'src/games/wanderburg/views/UnlockTab.vue',
      'src/games/terraria/views/CharacterTab.vue',
      'src/games/terraria/views/InventoryTab.vue'
    ]
    for (const rel of files) {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      expect(text, rel).toMatch(/void editor\.rev|editor\.rev|:data-ss-rev="editor\.rev"/)
    }
  })

  it('numeric editors prefer update:model-value over change for controlled InputNumber', () => {
    const files = [
      'src/games/chaos-front/views/ResourcesTab.vue',
      'src/games/chaos-front/views/PlanetsTab.vue',
      'src/games/chaos-front/views/UnitsTab.vue',
      'src/games/chaos-front/views/PilotsTab.vue',
      'src/games/wanderburg/views/ResourcesTab.vue',
      'src/games/terraria/views/CharacterTab.vue',
      'src/games/terraria/views/InventoryTab.vue'
    ]
    for (const rel of files) {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      const inputNumberBlocks = text.match(/<el-input-number[\s\S]*?\/>/g) ?? []
      expect(inputNumberBlocks.length, rel).toBeGreaterThan(0)
      for (const block of inputNumberBlocks) {
        expect(block, rel).toMatch(/@update:model-value/)
        expect(block, rel).not.toMatch(/@change=/)
      }
    }
  })

  it('UnitsTab uses row snapshots with index (not markRaw UnitEntry + indexOf)', () => {
    const text = readFileSync(join(ROOT, 'src/games/chaos-front/views/UnitsTab.vue'), 'utf8')
    expect(text).toMatch(/index\s*,/)
    expect(text).toMatch(/setUnitExp\(row\.index|\.index,\s*v/)
    expect(text).not.toMatch(/indexOf\(u\)|indexOf\(asUnit/)
    expect(text).toMatch(/isUnusedEntry/)
  })

  it('PlanetsTab uses row snapshots with index', () => {
    const text = readFileSync(join(ROOT, 'src/games/chaos-front/views/PlanetsTab.vue'), 'utf8')
    expect(text).toMatch(/index:/)
    expect(text).toMatch(/onStat\(row\.index/)
    expect(text).not.toMatch(/\$index,\s*'economics'/)
  })

  it('FormationTab equipment computeds subscribe to editor.rev without invTick', () => {
    const text = readFileSync(join(ROOT, 'src/games/chaos-front/views/FormationTab.vue'), 'utf8')
    expect(text).not.toMatch(/invTick/)
    expect(text).toMatch(/void editor\.rev/)
  })

  it('InventoryTab keeps el-dialog under a single root', () => {
    const text = readFileSync(join(ROOT, 'src/games/terraria/views/InventoryTab.vue'), 'utf8')
    const template = text.split('<template>')[1]?.split('</template>')[0] ?? ''
    expect(template).toMatch(/<div[^>]*class="te-inv"/)
    expect(template).toMatch(/<\/div>\s*$/)
    const withoutDialog = template.replace(/<el-dialog[\s\S]*?<\/el-dialog>/, '')
    expect(withoutDialog.match(/<div/g)?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(template.indexOf('<el-dialog')).toBeGreaterThan(template.indexOf('class="te-inv"'))
    expect(template.lastIndexOf('</el-dialog>')).toBeLessThan(template.lastIndexOf('</div>'))
  })
})
