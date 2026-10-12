import catalog from '../data/catalog.json'

export interface NamedId {
  id: number
  name: string
}

export interface AircraftCatalogEntry extends NamedId {
  code?: string
  category?: string
  missionOnly?: boolean
  spWeapons?: readonly string[]
}

type CatalogJson = {
  weaponOrder?: string[]
  aircraft: AircraftCatalogEntry[]
  skins: NamedId[]
  emblems: NamedId[]
  missions: { id: number; number: string; name: string }[]
}

const data = catalog as CatalogJson

export const WEAPON_ORDER: readonly string[] = data.weaponOrder ?? []
export const CATALOG_AIRCRAFT: readonly AircraftCatalogEntry[] = data.aircraft
export const CATALOG_SKINS: readonly NamedId[] = data.skins
export const CATALOG_EMBLEMS: readonly NamedId[] = data.emblems
export const CATALOG_MISSIONS: readonly { id: number; number: string; name: string }[] = data.missions

function indexById<T extends NamedId>(items: readonly T[]): Map<number, T> {
  return new Map(items.map((x) => [x.id, x]))
}

const aircraftById = indexById(CATALOG_AIRCRAFT)
const skinById = indexById(CATALOG_SKINS)
const emblemById = indexById(CATALOG_EMBLEMS)
const missionById = new Map(CATALOG_MISSIONS.map((x) => [x.id, x]))

export function aircraftInfo(id: number): AircraftCatalogEntry | undefined {
  return aircraftById.get(id)
}

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

/** `ELiveWeaponID::WID_mpbm` → `MPBM` */
export function weaponShortLabel(weaponId: string): string {
  const bare = weaponId.includes('::') ? weaponId.slice(weaponId.indexOf('::') + 2) : weaponId
  return bare.replace(/^WID_/i, '').toUpperCase()
}

export function matchesQuery(id: number, name: string, q: string): boolean {
  if (!q) return true
  const n = q.trim().toLowerCase()
  if (!n) return true
  return String(id).includes(n) || name.toLowerCase().includes(n)
}
