import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  readLibraryRecents,
  sortLibraryModules,
  touchLibraryRecent,
  LIBRARY_RECENTS_KEY
} from '../src/host/libraryOrder'

describe('sortLibraryModules', () => {
  const mods = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('orders by lastOpenedAt desc, then has-save, then registry order', () => {
    const ordered = sortLibraryModules(mods, {
      lastOpenedAt: { c: 100, a: 50 },
      hasSaveDir: (id) => id === 'b' || id === 'd' || id === 'a'
    })
    // c opened most recently → first
    // a opened but older → before never-opened
    // among never-opened: b and d both have save → registry order b then d
    expect(ordered.map((m) => m.id)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('prefers has-save among never-opened modules', () => {
    const ordered = sortLibraryModules(mods, {
      lastOpenedAt: {},
      hasSaveDir: (id) => id === 'd' || id === 'b'
    })
    expect(ordered.map((m) => m.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('keeps registry order when timestamps and save flags tie', () => {
    const ordered = sortLibraryModules(mods, {
      lastOpenedAt: { a: 1, b: 1, c: 1, d: 1 },
      hasSaveDir: () => true
    })
    expect(ordered.map((m) => m.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('library recents storage', () => {
  function stubStorage(initial: Record<string, string> = {}): Record<string, string> {
    const store = { ...initial }
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
    return store
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('round-trips touch and read', () => {
    stubStorage()
    touchLibraryRecent('phantom-blade-zero', 1_700_000_000_000)
    touchLibraryRecent('terraria', 1_700_000_000_100)
    expect(readLibraryRecents()).toEqual({
      'phantom-blade-zero': 1_700_000_000_000,
      terraria: 1_700_000_000_100
    })
  })

  it('ignores corrupt JSON and storage failures', () => {
    const store = stubStorage({ [LIBRARY_RECENTS_KEY]: '{not-json' })
    expect(readLibraryRecents()).toEqual({})

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0
    })
    expect(() => touchLibraryRecent('x', 1)).not.toThrow()
  })
})
