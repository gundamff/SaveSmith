import {
  getEntry,
  parseEs3Binary,
  serializeEs3Binary,
  setArray,
  setScalar,
  type Es3BinaryEntry
} from './es3-binary'

export type PlanetField =
  | 'faction'
  | 'defense'
  | 'resistance'
  | 'labourPoint'
  | 'hqLevel'
  | 'orbitalBuilding'
  | 'orbitalBuildingLevel'
  | 'surfaceBuilding'
  | 'surfaceBuildingLevel'

export type FleetUnitSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface CommanderRow {
  id: number
  exp: number
  admin: number
  military: number
  intellect: number
  breeding: number
  star: number
  skills: number[]
}

export interface PlanetRow {
  id: number
  faction: number
  defense: number
  resistance: number
  labourPoint: number
  hqLevel: number
  orbitalBuilding?: number[]
  orbitalBuildingLevel?: number[]
  surfaceBuilding?: number[]
  surfaceBuildingLevel?: number[]
}

export interface FleetRow {
  id: number
  faction: number
  commander: number
  /** Real saves store Flagship as int[4] (same shape as a unit slot). */
  flagship: number | number[] | null
  status: number | number[] | null
  units: (number[] | null)[]
}

const PLANET_SUFFIX: Record<PlanetField, string> = {
  faction: 'Faction',
  defense: 'Defense',
  resistance: 'Resistance',
  labourPoint: 'LabourPoint',
  hqLevel: 'HQlevel',
  orbitalBuilding: 'OrbitalBuilding',
  orbitalBuildingLevel: 'OrbitalBuildingLevel',
  surfaceBuilding: 'SurfaceBuilding',
  surfaceBuildingLevel: 'SurfaceBuildingLevel'
}

const PLANET_ARRAY_FIELDS = new Set<PlanetField>([
  'orbitalBuilding',
  'orbitalBuildingLevel',
  'surfaceBuilding',
  'surfaceBuildingLevel'
])

const COMMANDER_INT_FIELDS = ['exp', 'admin', 'military', 'intellect', 'breeding', 'star'] as const
const COMMANDER_SUFFIX: Record<(typeof COMMANDER_INT_FIELDS)[number], string> = {
  exp: 'Exp',
  admin: 'Admin',
  military: 'Military',
  intellect: 'Intellect',
  breeding: 'Breeding',
  star: 'Star'
}

const FLEET_UNIT_SLOTS = 14

export class SaveData {
  constructor(public entries: Es3BinaryEntry[]) {}

  static load(bytes: Uint8Array): SaveData {
    return new SaveData(parseEs3Binary(bytes))
  }

  serialize(): Uint8Array {
    return serializeEs3Binary(this.entries)
  }

  getPlayFaction(): number {
    return this.requireInt('PlayFaction')
  }

  getFactionGold(faction: number): number {
    return this.requireInt(`Faction${faction}Gold`)
  }

  setFactionGold(faction: number, v: number): void {
    setScalar(this.entries, `Faction${faction}Gold`, Math.round(v))
  }

  getFactionSupply(faction: number): number {
    return this.requireInt(`Faction${faction}Supply`)
  }

  setFactionSupply(faction: number, v: number): void {
    setScalar(this.entries, `Faction${faction}Supply`, Math.round(v))
  }

  getFactionPrestige(faction: number): number {
    return this.requireInt(`Faction${faction}Prestige`)
  }

  setFactionPrestige(faction: number, v: number): void {
    setScalar(this.entries, `Faction${faction}Prestige`, Math.round(v))
  }

  getPlayerEconomicsLevel(): number {
    return this.requireInt('PlayerEconomicsLevel')
  }

  setPlayerEconomicsLevel(v: number): void {
    setScalar(this.entries, 'PlayerEconomicsLevel', Math.round(v))
  }

  getPlayMonth(): number {
    return this.requireInt('playMonth')
  }

  setPlayMonth(v: number): void {
    setScalar(this.entries, 'playMonth', Math.round(v))
  }

  listPlanetIds(): number[] {
    return collectIds(this.entries, /^Planet(\d+)Defense$/)
  }

  getPlanet(id: number): PlanetRow {
    this.requireInt(`Planet${id}Defense`)
    return {
      id,
      faction: this.optionalInt(`Planet${id}Faction`),
      defense: this.optionalInt(`Planet${id}Defense`),
      resistance: this.optionalInt(`Planet${id}Resistance`),
      labourPoint: this.optionalInt(`Planet${id}LabourPoint`),
      hqLevel: this.optionalInt(`Planet${id}HQlevel`),
      orbitalBuilding: this.optionalIntArray(`Planet${id}OrbitalBuilding`),
      orbitalBuildingLevel: this.optionalIntArray(`Planet${id}OrbitalBuildingLevel`),
      surfaceBuilding: this.optionalIntArray(`Planet${id}SurfaceBuilding`),
      surfaceBuildingLevel: this.optionalIntArray(`Planet${id}SurfaceBuildingLevel`)
    }
  }

  setPlanetField(id: number, field: PlanetField, v: number | number[]): void {
    const key = `Planet${id}${PLANET_SUFFIX[field]}`
    if (PLANET_ARRAY_FIELDS.has(field)) {
      if (!Array.isArray(v)) {
        throw new Error(`Planet field "${field}" expects an array`)
      }
      setArray(this.entries, key, v)
      return
    }
    if (typeof v !== 'number') {
      throw new Error(`Planet field "${field}" expects a number`)
    }
    setScalar(this.entries, key, Math.round(v))
  }

  listCommanderIds(): number[] {
    return collectIds(this.entries, /^Commander(\d+)Exp$/)
  }

  getCommander(id: number): CommanderRow {
    this.requireInt(`Commander${id}Exp`)
    return {
      id,
      exp: this.optionalInt(`Commander${id}Exp`),
      admin: this.optionalInt(`Commander${id}Admin`),
      military: this.optionalInt(`Commander${id}Military`),
      intellect: this.optionalInt(`Commander${id}Intellect`),
      breeding: this.optionalInt(`Commander${id}Breeding`),
      star: this.optionalInt(`Commander${id}Star`),
      skills: this.optionalIntArray(`Commander${id}Skills`) ?? []
    }
  }

  setCommander(id: number, patch: Partial<CommanderRow>): void {
    this.requireInt(`Commander${id}Exp`)
    for (const field of COMMANDER_INT_FIELDS) {
      const value = patch[field]
      if (value === undefined) continue
      setScalar(this.entries, `Commander${id}${COMMANDER_SUFFIX[field]}`, Math.round(value))
    }
    if (patch.skills !== undefined) {
      setArray(this.entries, `Commander${id}Skills`, patch.skills)
    }
  }

  listFleetIds(): number[] {
    return collectIds(this.entries, /^Fleet(\d+)/)
  }

  getFleet(id: number): FleetRow {
    if (!this.listFleetIds().includes(id)) {
      throw new Error(`Missing entry "Fleet${id}"`)
    }
    const units: (number[] | null)[] = []
    for (let slot = 1; slot <= FLEET_UNIT_SLOTS; slot++) {
      units.push(this.optionalIntArray(`Fleet${id}Unit${slot}`) ?? null)
    }
    return {
      id,
      faction: this.optionalInt(`Fleet${id}Faction`),
      commander: this.optionalInt(`Fleet${id}Commander`),
      flagship: this.readNumberOrArray(`Fleet${id}Flagship`),
      status: this.readNumberOrArray(`Fleet${id}Status`),
      units
    }
  }

  setFleetUnit(fleetId: number, slot: FleetUnitSlot, unitTuple: number[]): void {
    if (slot < 1 || slot > FLEET_UNIT_SLOTS) {
      throw new Error(`Fleet unit slot must be 1..${FLEET_UNIT_SLOTS}`)
    }
    setArray(this.entries, `Fleet${fleetId}Unit${slot}`, unitTuple)
  }

  setFleetCommander(fleetId: number, commanderId: number): void {
    setScalar(this.entries, `Fleet${fleetId}Commander`, Math.round(commanderId))
  }

  /** Sets existing Faction{f}*Unlocked bool/int fields. Does not add keys or touch raw. */
  unlockAllKnown(faction: number): void {
    const unlockKey = new RegExp(`^Faction${faction}(?!\\d).*Unlocked`)
    for (const entry of this.entries) {
      if (!unlockKey.test(entry.key)) continue
      if (entry.kind === 'bool') {
        setScalar(this.entries, entry.key, true)
      } else if (entry.kind === 'int') {
        setScalar(this.entries, entry.key, 1)
      }
    }
  }

  private requireInt(key: string): number {
    const entry = getEntry(this.entries, key)
    if (!entry || typeof entry.value !== 'number') {
      throw new Error(`Missing entry "${key}"`)
    }
    return entry.value
  }

  private optionalInt(key: string, fallback = 0): number {
    const entry = getEntry(this.entries, key)
    return typeof entry?.value === 'number' ? entry.value : fallback
  }

  private optionalIntArray(key: string): number[] | undefined {
    const entry = getEntry(this.entries, key)
    if (!entry || entry.kind !== 'int[]' || !Array.isArray(entry.value)) return undefined
    return entry.value as number[]
  }

  private readNumberOrArray(key: string): number | number[] | null {
    const entry = getEntry(this.entries, key)
    if (!entry) return null
    if (entry.kind === 'int' || entry.kind === 'float') return entry.value as number
    if (entry.kind === 'int[]') return entry.value as number[]
    return null
  }
}

function collectIds(entries: Es3BinaryEntry[], pattern: RegExp): number[] {
  const ids = new Set<number>()
  for (const entry of entries) {
    const match = pattern.exec(entry.key)
    if (match) ids.add(Number(match[1]))
  }
  return [...ids].sort((a, b) => a - b)
}
