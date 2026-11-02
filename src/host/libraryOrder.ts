export const LIBRARY_RECENTS_KEY = 'savesmith-library-recents'

export type LibraryRecents = Record<string, number>

export interface SortLibraryOptions {
  lastOpenedAt: Readonly<LibraryRecents>
  hasSaveDir: (gameId: string) => boolean
}

export function readLibraryRecents(): LibraryRecents {
  try {
    const raw = localStorage.getItem(LIBRARY_RECENTS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: LibraryRecents = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        out[id] = value
      }
    }
    return out
  } catch {
    return {}
  }
}

export function touchLibraryRecent(gameId: string, now = Date.now()): void {
  if (!gameId) return
  try {
    const next = { ...readLibraryRecents(), [gameId]: now }
    localStorage.setItem(LIBRARY_RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

export function sortLibraryModules<T extends { id: string }>(
  modules: readonly T[],
  options: SortLibraryOptions
): T[] {
  const registryIndex = new Map(modules.map((mod, index) => [mod.id, index]))
  return [...modules].sort((a, b) => {
    const openedA = options.lastOpenedAt[a.id] ?? 0
    const openedB = options.lastOpenedAt[b.id] ?? 0
    if (openedB !== openedA) return openedB - openedA

    const saveA = options.hasSaveDir(a.id) ? 1 : 0
    const saveB = options.hasSaveDir(b.id) ? 1 : 0
    if (saveB !== saveA) return saveB - saveA

    return (registryIndex.get(a.id) ?? 0) - (registryIndex.get(b.id) ?? 0)
  })
}
