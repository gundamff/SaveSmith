import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { BackupInfoDto } from '@host/tauri'
import {
  resetSessionIo,
  setSessionIo,
  useSessionStore,
  type SessionIo
} from '@host/stores/session'
import { dummyModule } from './dummyModule'

const enc = (s: string) => new TextEncoder().encode(s)

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
      list.unshift({
        name,
        mtimeMs: Date.now(),
        size: copy.length,
        bytes: new Uint8Array(files[relativePath] ?? copy)
      })
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

describe('session save feedback', () => {
  it('reports noChanges when serialized bytes match the loaded original', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')

    const issues = await store.save()

    expect(issues).toEqual([])
    expect(io.writes).toHaveLength(0)
    expect(store.dirty).toBe(false)
    expect(store.lastSave).toMatchObject({ kind: 'noChanges' })
  })

  it('reports how many files were written on success', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.mutate((state) => ({ gold: (state as { gold: number }).gold + 5 }))

    const issues = await store.save()

    expect(issues).toEqual([])
    expect(io.writes).toHaveLength(1)
    expect(store.lastSave).toMatchObject({ kind: 'saved', fileCount: 1 })
    expect(typeof (store.lastSave as { at: number }).at).toBe('number')
    expect(store.lastError).toBeNull()
  })

  it('reports validation failures without writing', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.mutate(() => ({ gold: -1 }))

    const issues = await store.save()

    expect(issues).toEqual([{ code: 'NEGATIVE_GOLD', args: [] }])
    expect(io.writes).toHaveLength(0)
    expect(store.lastSave).toMatchObject({
      kind: 'invalid',
      issues: [{ code: 'NEGATIVE_GOLD', args: [] }]
    })
    expect(store.lastError?.message).toBeTruthy()
  })

  it('reports write failures and keeps dirty state', async () => {
    const io = createMemoryIo({ 'save.txt': enc('10') })
    io.writeAtomic = async () => {
      throw new Error('synthetic disk failure')
    }
    setSessionIo(io)
    const store = useSessionStore()
    await store.openGame(dummyModule, 'D:\\saves')
    await store.loadSlot('slot-0')
    store.runAction('fill')

    await expect(store.save()).rejects.toThrow('synthetic disk failure')

    expect(store.dirty).toBe(true)
    expect(store.lastSave).toMatchObject({ kind: 'failed' })
    expect(store.lastError?.message).toBe('synthetic disk failure')
  })
})
