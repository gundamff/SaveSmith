import { ModuleError } from '@sdk/error'
import type { GameModule, ListedFiles, SlotBytes } from '@sdk/types'

export type DummyState = { gold: number }

export const dummyModule: GameModule<DummyState> = {
  id: 'dummy',
  catalog: {
    name: { zh: '假游戏', en: 'Dummy Game' },
    cover: '',
    rightsHolder: 'test'
  },
  locate: {
    windowsPathTemplates: [],
    identifyAnyOf: ['save.txt']
  },
  views: [],
  listSlots(files: ListedFiles) {
    const hasSave = files.files.some((file) => file.relativePath === 'save.txt')
    if (!hasSave) return []
    return [{ id: 'slot-0', exists: true, readable: true, sessionFiles: ['save.txt'] }]
  },
  parse(files: SlotBytes[]) {
    const save = files.find((file) => file.relativePath === 'save.txt')
    const text = save ? new TextDecoder().decode(save.bytes) : '0'
    return { gold: Number.parseInt(text, 10) }
  },
  serialize(state: DummyState) {
    return [{ relativePath: 'save.txt', bytes: new TextEncoder().encode(String(state.gold)) }]
  },
  validate(state: DummyState) {
    if (state.gold < 0) return [{ code: 'NEGATIVE_GOLD', args: [] }]
    return []
  },
  actions(_state: DummyState) {
    return [{ id: 'fill', labelKey: 'fill', kind: 'button' as const }]
  },
  applyAction(state: DummyState, id: string) {
    if (id === 'fill') return { gold: 999 }
    throw new ModuleError('UNKNOWN_ACTION', [id])
  }
}
