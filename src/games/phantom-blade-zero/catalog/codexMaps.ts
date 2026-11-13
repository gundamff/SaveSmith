import { locale } from '../../../host/i18n'
import data from './codexMaps.json'

export interface PbzCodexMap {
  readonly id: string
  readonly zh: string
  readonly en: string
  readonly order: number
}

export const pbzCodexMaps: readonly PbzCodexMap[] = Object.freeze(
  data.maps.map((row) => Object.freeze({ ...row }))
)

const byIdLower = new Map(pbzCodexMaps.map((row) => [row.id.toLowerCase(), row]))

export function getPbzCodexMap(mapId: string): PbzCodexMap | undefined {
  if (!mapId) return undefined
  return byIdLower.get(mapId.toLowerCase())
}

export function listPbzCodexMaps(): readonly PbzCodexMap[] {
  return [...pbzCodexMaps].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/** Maps that actually appear on enemy catalog rows, sorted by chapter order. */
export function listPbzCodexMapsUsedByEnemies(ownMapIds: Iterable<string>): readonly PbzCodexMap[] {
  const seen = new Set<string>()
  for (const raw of ownMapIds) {
    const key = raw.trim().toLowerCase()
    if (key) seen.add(key)
  }
  return listPbzCodexMaps().filter((row) => seen.has(row.id.toLowerCase()))
}

export function pbzCodexMapName(
  mapId: string,
  language: 'zh' | 'en' = locale.value === 'en' ? 'en' : 'zh'
): string {
  const row = getPbzCodexMap(mapId)
  if (!row) return mapId || '—'
  if (language === 'zh') return row.zh || row.en || row.id
  return row.en || row.id
}

export function normalizePbzCodexMapId(mapId: string): string {
  return getPbzCodexMap(mapId)?.id ?? mapId
}
