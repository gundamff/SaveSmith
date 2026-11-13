import { locale } from '../../../host/i18n'
import data from './codexBooks.json'
import { pbzCodexMapName } from './codexMaps'

export type PbzCodexBookKind = 'book' | 'page'

export interface PbzCodexBookEntry {
  readonly id: string
  readonly zh: string
  readonly en: string
  readonly ownMapId: string
  readonly parentId: string
  readonly displayOrder: number
  readonly kind: PbzCodexBookKind
}

function freezeEntry(
  row: {
    id: string
    zh: string
    en: string
    ownMapId: string
    parentId: string
    displayOrder: number
  },
  kind: PbzCodexBookKind
): PbzCodexBookEntry {
  return Object.freeze({ ...row, kind })
}

export const pbzCodexBooks: readonly PbzCodexBookEntry[] = Object.freeze([
  ...data.books.map((row) => freezeEntry(row, 'book')),
  ...data.pages.map((row) => freezeEntry(row, 'page'))
])

const byId = new Map(pbzCodexBooks.map((row) => [row.id, row]))

export function listPbzCodexBooks(): readonly PbzCodexBookEntry[] {
  return [...pbzCodexBooks].sort(
    (a, b) =>
      Number(a.kind === 'page') - Number(b.kind === 'page') ||
      a.displayOrder - b.displayOrder ||
      a.id.localeCompare(b.id)
  )
}

export function getPbzCodexBookById(id: string): PbzCodexBookEntry | undefined {
  return byId.get(id)
}

export function isWhitelistedCodexBookId(id: string): boolean {
  return byId.has(id)
}

export function pbzCodexBookName(
  row: PbzCodexBookEntry,
  language: 'zh' | 'en' = locale.value === 'en' ? 'en' : 'zh'
): string {
  if (language === 'zh') return row.zh || row.id
  return row.en || row.id
}

export function listPbzCodexBookPages(bookId: string): readonly PbzCodexBookEntry[] {
  return pbzCodexBooks.filter((row) => row.kind === 'page' && row.parentId === bookId)
}

export function searchPbzCodexBooks(query: string): readonly PbzCodexBookEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  const rows = listPbzCodexBooks()
  if (!needle) return rows
  return rows.filter((row) => {
    const mapZh = pbzCodexMapName(row.ownMapId, 'zh')
    const mapEn = pbzCodexMapName(row.ownMapId, 'en')
    return [row.id, row.zh, row.en, row.ownMapId, row.parentId, mapZh, mapEn].some((v) =>
      v.toLocaleLowerCase().includes(needle)
    )
  })
}
