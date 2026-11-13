import { locale } from '../../../host/i18n'
import data from './codexMemories.json'
import { pbzCodexMapName } from './codexMaps'

export type PbzCodexMemoryKind = 'flower' | 'petal'

export interface PbzCodexMemoryEntry {
  readonly id: string
  readonly zh: string
  readonly en: string
  readonly ownMapId: string
  readonly parentId: string
  readonly displayOrder: number
  readonly isWhiteFlower: boolean
  readonly kind: PbzCodexMemoryKind
}

function freezeEntry(
  row: {
    id: string
    zh: string
    en: string
    ownMapId: string
    parentId: string
    displayOrder: number
    isWhiteFlower: boolean
  },
  kind: PbzCodexMemoryKind
): PbzCodexMemoryEntry {
  return Object.freeze({ ...row, kind })
}

export const pbzCodexMemories: readonly PbzCodexMemoryEntry[] = Object.freeze([
  ...data.flowers.map((row) => freezeEntry(row, 'flower')),
  ...data.petals.map((row) => freezeEntry(row, 'petal'))
])

const byId = new Map(pbzCodexMemories.map((row) => [row.id, row]))

export function listPbzCodexMemories(): readonly PbzCodexMemoryEntry[] {
  return [...pbzCodexMemories].sort(
    (a, b) =>
      Number(a.kind === 'petal') - Number(b.kind === 'petal') ||
      a.displayOrder - b.displayOrder ||
      a.id.localeCompare(b.id)
  )
}

export function getPbzCodexMemoryById(id: string): PbzCodexMemoryEntry | undefined {
  return byId.get(id)
}

export function isWhitelistedCodexMemoryId(id: string): boolean {
  return byId.has(id)
}

export function pbzCodexMemoryName(
  row: PbzCodexMemoryEntry,
  language: 'zh' | 'en' = locale.value === 'en' ? 'en' : 'zh'
): string {
  if (language === 'zh') return row.zh || row.id
  return row.en || row.id
}

export function listPbzCodexMemoryPetals(flowerId: string): readonly PbzCodexMemoryEntry[] {
  return pbzCodexMemories.filter((row) => row.kind === 'petal' && row.parentId === flowerId)
}

export function searchPbzCodexMemories(query: string): readonly PbzCodexMemoryEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  const rows = listPbzCodexMemories()
  if (!needle) return rows
  return rows.filter((row) => {
    const mapZh = pbzCodexMapName(row.ownMapId, 'zh')
    const mapEn = pbzCodexMapName(row.ownMapId, 'en')
    return [row.id, row.zh, row.en, row.ownMapId, row.parentId, mapZh, mapEn].some((v) =>
      v.toLocaleLowerCase().includes(needle)
    )
  })
}
