import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import type { GameModule, SlotBytes } from '@sdk/types'
import type { BackupInfoDto } from '@host/tauri'
import { dummyModule, type DummyState } from './dummyModule'
import {
  resetSessionIo,
  setSessionIo,
  useSessionStore,
  type SessionIo
} from '@host/stores/session'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (b: Uint8Array) => new TextDecoder().decode(b)

function createMemoryIo(initial: Record<string, Uint8Array>): SessionIo & {
  files: Record<string, Uint8Array>
  writes: Array<{ relativePath: string; bytes: Uint8Array }>
} {
  const files: Record<string, Uint8Array> = { ...initial }
  const storedBackups = new Map<string, Array<BackupInfoDto & { bytes: Uint8Array }>>()
  const writes: Array<{ relativePath: string; bytes: Uint8Array }> = []

  const io: SessionIo & {
    files: Record<string, Uint8Array>
    writes: Array<{ relativePath: string; bytes: Uint8Array }>
  } = {
    files,
    writes,
    async listDirNames() {
      return Object.keys(files)
    },
    async readFileBytes(_dir, relativePath) {
      const bytes = files[relativePath]
      if (!bytes) throw new Error('ENOENT')
      return new Uint8Array(bytes)
    },
    async writeAtomic(_dir, relativePath, bytes) {
      const copy = new Uint8Array(bytes)
      writes.push({ relativePath, bytes: copy })
      const list = storedBackups.get(relativePath) ?? []
      const name = `${list.length}-${relativePath.replace(/[\\/]/g, '_')}`
      list.unshift({ name, mtimeMs: Date.now(), size: copy.length, bytes: new Uint8Array(files[relativePath] ?? copy) })
      storedBackups.set(relativePath, list)
      files[relativePath] = copy
      return name
    },
    async listBackups(_dir, relativePath) {
      return (storedBackups.get(relativePath) ?? []).map(({ name, mtimeMs, size }) => ({
        name,
        mtimeMs,
        size
      }))
    },
    async restoreBackup(_dir, relativePath, name) {
      const hit = (storedBackups.get(relativePath) ?? []).find((b) => b.name === name)
      if (!hit) throw new Error('NO_BACKUP')
      files[relativePath] = new Uint8Array(hit.bytes)
    },
    async deleteBackup(_dir, name) {
      for (const [relativePath, list] of storedBackups) {
        const next = list.filter((b) => b.name !== name)
        if (next.length !== list.length) {
          storedBackups.set(relativePath, next)
          return
        }
      }
      throw new Error('NO_BACKUP')
    }
  }
  return io
}

beforeEach(() => {
  setActivePinia(createPinia())
  resetSessionIo()
})

afterEach(() => {
  resetSessionIo()
})

describe('useSessionStore', () => {
  it('openGame reads nested slot files via slotFilePatterns', async () => {
    const nestedPath = 'Saves/Playtest/Generation_0001/SaveData.json'
    const io = createMemoryIo({ [nestedPath]: enc('{"gold":99}') })
    io.listRelativeFilePaths = async () => [nestedPath, 'Player.log']
    const reads: string[] = []
    const origRead = io.readFileBytes.bind(io)
    io.readFileBytes = async (dir, relativePath) => {
      reads.push(relativePath)
      return origRead(dir, relativePath)
    }
    const nested: GameModule<DummyState> = {
      ...dummyModule,
      locate: {
        windowsPathTemplates: [],
        identifyAnyOf: ['Player.log'],
        slotFilePatterns: ['Saves/Playtest/Generation_*/SaveData.json']
      },
      listSlots(files) {
        const hit = files.files.find((f) => f.relativePath === nestedPath)
        expect(hit?.bytes).not.toBeNull()
        return [{ id: 'gen-1', exists: true, readable: true, sessionFiles: [nestedPath] }]
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(nested, 'D:\\saves')
    expect(reads).toContain(nestedPath)
    expect(store.slots).toHaveLength(1)
    expect(store.slots[0].id).toBe('gen-1')
  })

  it('openGame surfaces listRelativeFilePaths failure as loadError', async () => {
    const io = createMemoryIo({ 'Saves': enc('dir') })
    io.listRelativeFilePaths = async () => {
      throw new Error('command list_relative_file_paths not allowed')
    }
    const nested: GameModule<DummyState> = {
      ...dummyModule,
      locate: {
        windowsPathTemplates: [],
        identifyAnyOf: ['Saves'],
        slotFilePatterns: ['Saves/Playtest/Generation_*/SaveData.json']
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(nested, 'D:\\saves')
    expect(store.slots).toEqual([])
    expect(store.loadError).toBeTruthy()
  })

  it('openGame only reads identifyAnyOf names that exist', async () => {
    const io = createMemoryIo({
      'save.txt': enc('10'),
      'noise.bin': enc('xxxx'),
      'huge.log': enc('yyyy')
    })
    const reads: string[] = []
    const origRead = io.readFileBytes.bind(io)
    io.readFileBytes = async (dir, relativePath) => {
      reads.push(relativePath)
      return origRead(dir, relativePath)
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    expect(reads).toEqual(['save.txt'])
    expect(store.slots).toHaveLength(1)
  })

  it('openGame lists slots from locate files (read failure keeps bytes null)', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    const origRead = io.readFileBytes.bind(io)
    io.readFileBytes = async (dir, relativePath) => {
      if (relativePath === 'ghost.dat') throw new Error('missing')
      return origRead(dir, relativePath)
    }
    const withGhost: GameModule<DummyState> = {
      ...dummyModule,
      locate: { windowsPathTemplates: [], identifyAnyOf: ['save.txt', 'ghost.dat'] },
      listSlots(files) {
        expect(files.dir).toBe('D:\\saves')
        const ghost = files.files.find((f) => f.relativePath === 'ghost.dat')
        expect(ghost?.bytes).toBeNull()
        return dummyModule.listSlots(files)
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(withGhost, 'D:\\saves')
    expect(store.game?.id).toBe('dummy')
    expect(store.saveDir).toBe('D:\\saves')
    expect(store.slots).toHaveLength(1)
    expect(store.slots[0].id).toBe('slot-0')
    expect(store.dirty).toBe(false)
    expect(store.state).toBeNull()
  })

  it('loadSlot parses bytes, clears dirty, and pulls backups per session file', async () => {
    const io = createMemoryIo({ 'save.txt': enc('42') })
    await io.writeAtomic('D:\\saves', 'save.txt', enc('42'))
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    expect(store.currentSlotId).toBe('slot-0')
    expect(store.state).toEqual({ gold: 42 })
    expect(store.dirty).toBe(false)
    expect(store.loadError).toBeNull()
    expect(store.original).toHaveLength(1)
    expect(dec(store.original[0].bytes)).toBe('42')
    expect(store.backups.length).toBeGreaterThan(0)
  })

  it('loadSlot sets loadError and does not set state when a session file cannot be read', async () => {
    const io = createMemoryIo({})
    io.listDirNames = async () => ['save.txt']
    io.readFileBytes = async () => {
      throw new Error('locked')
    }
    const listing: GameModule<DummyState> = {
      ...dummyModule,
      listSlots() {
        return [{ id: 'slot-0', exists: true, readable: true, sessionFiles: ['save.txt'] }]
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(listing, 'D:\\saves')
    await store.loadSlot('slot-0')
    expect(store.state).toBeNull()
    expect(store.original).toEqual([])
    expect(store.loadError).toBeTruthy()
  })

  it('loadSlot skips missing optional session files and still parses save.txt', async () => {
    const io = createMemoryIo({ 'save.txt': enc('42') })
    const origRead = io.readFileBytes.bind(io)
    io.readFileBytes = async (dir, relativePath) => {
      if (relativePath === 'collection.cf') throw new Error('ENOENT')
      return origRead(dir, relativePath)
    }
    const listing: GameModule<DummyState> = {
      ...dummyModule,
      listSlots() {
        return [{ id: 'slot-0', exists: true, readable: true, sessionFiles: ['save.txt', 'collection.cf'] }]
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(listing, 'D:\\saves')
    await store.loadSlot('slot-0')
    expect(store.currentSlotId).toBe('slot-0')
    expect(store.state).toEqual({ gold: 42 })
    expect(store.loadError).toBeNull()
    expect(store.original).toHaveLength(1)
    expect(store.original[0].relativePath).toBe('save.txt')
    expect(dec(store.original[0].bytes)).toBe('42')
  })

  it('loadSlot skips empty optional session files and still parses save.txt', async () => {
    const io = createMemoryIo({ 'save.txt': enc('7') })
    io.readFileBytes = async (_dir, relativePath) => {
      if (relativePath === 'collection.cf') return new Uint8Array()
      const bytes = io.files[relativePath]
      if (!bytes) throw new Error('ENOENT')
      return new Uint8Array(bytes)
    }
    const listing: GameModule<DummyState> = {
      ...dummyModule,
      listSlots() {
        return [{ id: 'slot-0', exists: true, readable: true, sessionFiles: ['save.txt', 'collection.cf'] }]
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(listing, 'D:\\saves')
    await store.loadSlot('slot-0')
    expect(store.currentSlotId).toBe('slot-0')
    expect(store.state).toEqual({ gold: 7 })
    expect(store.loadError).toBeNull()
    expect(store.original).toHaveLength(1)
    expect(store.original[0].relativePath).toBe('save.txt')
  })

  it('loadSlot records parse errors without assigning state', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    const boom: GameModule<DummyState> = {
      ...dummyModule,
      parse() {
        throw new ModuleError('EMPTY_SERIALIZE', [])
      }
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(boom, 'D:\\saves')
    await store.loadSlot('slot-0')
    expect(store.state).toBeNull()
    expect(store.dirty).toBe(false)
    expect(store.loadError).toBeTruthy()
  })

  it('runAction applies the module action and marks dirty', async () => {
    const io = createMemoryIo({ 'save.txt': enc('1') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.runAction('fill')
    expect((store.state as DummyState).gold).toBe(999)
    expect(store.dirty).toBe(true)
  })

  it('mutate updates state and marks dirty', async () => {
    const io = createMemoryIo({ 'save.txt': enc('5') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.mutate((s) => ({ gold: (s as DummyState).gold + 1 }))
    expect((store.state as DummyState).gold).toBe(6)
    expect(store.dirty).toBe(true)
  })

  it('save returns validate issues and does not write', async () => {
    const io = createMemoryIo({ 'save.txt': enc('0') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.mutate(() => ({ gold: -3 }))
    const issues = await store.save()
    expect(issues).toEqual([{ code: 'NEGATIVE_GOLD', args: [] }])
    expect(io.writes).toHaveLength(0)
    expect(store.dirty).toBe(true)
  })

  it('save writes only changed files, remaps original, and clears dirty', async () => {
    const extra: GameModule<DummyState> = {
      ...dummyModule,
      listSlots() {
        return [{ id: 'slot-0', exists: true, readable: true, sessionFiles: ['save.txt', 'meta.txt'] }]
      },
      parse(files: SlotBytes[]) {
        return dummyModule.parse(files)
      },
      serialize(state) {
        return [
          { relativePath: 'save.txt', bytes: enc(String(state.gold)) },
          { relativePath: 'meta.txt', bytes: enc('meta') }
        ]
      }
    }
    const io = createMemoryIo({ 'save.txt': enc('10'), 'meta.txt': enc('meta') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(extra, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.runAction('fill')
    const issues = await store.save()
    expect(issues).toEqual([])
    expect(io.writes).toHaveLength(1)
    expect(io.writes[0].relativePath).toBe('save.txt')
    expect(dec(io.writes[0].bytes)).toBe('999')
    expect(store.dirty).toBe(false)
    expect(dec(store.original.find((f) => f.relativePath === 'save.txt')!.bytes)).toBe('999')
    expect(dec(store.original.find((f) => f.relativePath === 'meta.txt')!.bytes)).toBe('meta')
  })

  it('save rejects empty serialize via assertSerializeSane', async () => {
    const emptySer: GameModule<DummyState> = {
      ...dummyModule,
      serialize() {
        return []
      }
    }
    const io = createMemoryIo({ 'save.txt': enc('1') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(emptySer, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.mutate((s) => ({ gold: (s as DummyState).gold }))
    await expect(store.save()).rejects.toBeInstanceOf(ModuleError)
    expect(io.writes).toHaveLength(0)
    expect(store.dirty).toBe(true)
  })

  it('restore writes the backup back and reloads the slot', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.runAction('fill')
    await store.save()
    store.mutate(() => ({ gold: 1 }))
    await store.save()
    await store.restore('save.txt', store.backups[0].name)
    expect((store.state as DummyState).gold).toBe(999)
    expect(store.dirty).toBe(false)
    expect(store.currentSlotId).toBe('slot-0')
  })

  it('removeBackup deletes a backup entry and refreshes the list', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.runAction('fill')
    await store.save()
    expect(store.backups.length).toBe(1)
    const name = store.backups[0]!.name
    await store.removeBackup('save.txt', name)
    expect(store.backups.find((b) => b.name === name)).toBeUndefined()
  })

  it('goLibrary clears the session', async () => {
    const io = createMemoryIo({ 'save.txt': enc('1') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.runAction('fill')
    store.goLibrary()
    expect(store.game).toBeNull()
    expect(store.saveDir).toBe('')
    expect(store.slots).toEqual([])
    expect(store.currentSlotId).toBeNull()
    expect(store.state).toBeNull()
    expect(store.original).toEqual([])
    expect(store.dirty).toBe(false)
    expect(store.backups).toEqual([])
    expect(store.loadError).toBeNull()
  })
})
