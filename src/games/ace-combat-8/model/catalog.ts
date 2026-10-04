import catalog from '../data/catalog.json'

export interface NamedId {
  id: number
  name: string
}

export const CATALOG_AIRCRAFT: readonly NamedId[] = catalog.aircraft
export const CATALOG_SKINS: readonly NamedId[] = catalog.skins
export const CATALOG_EMBLEMS: readonly NamedId[] = catalog.emblems
export const CATALOG_MISSIONS: readonly { id: number; number: string; name: string }[] = catalog.missions

function indexById(items: readonly NamedId[]): Map<number, NamedId> {
  return new Map(items.map((x) => [x.id, x]))
}

const aircraftById = indexById(CATALOG_AIRCRAFT)
const skinById = indexById(CATALOG_SKINS)
const emblemById = indexById(CATALOG_EMBLEMS)
const missionById = new Map(CATALOG_MISSIONS.map((x) => [x.id, x]))

export function aircraftLabel(id: number): string {
  return aircraftById.get(id)?.name ?? String(id)
}

export function skinLabel(id: number): string {
  return skinById.get(id)?.name ?? String(id)
}

export function emblemLabel(id: number): string {
  return emblemById.get(id)?.name ?? String(id)
}

export function missionLabel(id: number): string {
  const m = missionById.get(id)
  if (!m) return String(id)
  return m.number ? `${m.number}: ${m.name}` : m.name
}

export function matchesQuery(id: number, name: string, q: string): boolean {
  if (!q) return true
  const n = q.trim().toLowerCase()
  if (!n) return true
  return String(id).includes(n) || name.toLowerCase().includes(n)
}
