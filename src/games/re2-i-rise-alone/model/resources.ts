import { ModuleError } from '@sdk/error'

/**
 * Protagonist stats from FrameWork.Tool.GetAllPropertyKey():
 * Stamina, Wisdom, Charm, Morality, CapacityForLiquor, Execution, Money, Pressure.
 * Favorability (MMFavorability) stays out of phase-1.
 */
export const RESOURCE_KEYS = [
  'Stamina',
  'Wisdom',
  'Charm',
  'Morality',
  'CapacityForLiquor',
  'Execution',
  'Money',
  'Pressure'
] as const
export type ResourceKey = (typeof RESOURCE_KEYS)[number]

export function dataKey(k: ResourceKey): string {
  return `property_Property_${k}`
}

/** Present whitelist values only (missing keys omitted). */
export function readResources(data: Record<string, string>): Partial<Record<ResourceKey, number>> {
  const out: Partial<Record<ResourceKey, number>> = {}
  for (const k of RESOURCE_KEYS) {
    const raw = data[dataKey(k)]
    if (raw === undefined) continue
    if (!/^\d+$/.test(raw)) continue
    out[k] = Number(raw)
  }
  return out
}

/**
 * UI projection: every protagonist attr is always visible.
 * Missing save keys surface as 0 (same default GetProperty uses).
 */
export function projectResources(data: Record<string, string>): Record<ResourceKey, number> {
  const partial = readResources(data)
  const out = {} as Record<ResourceKey, number>
  for (const k of RESOURCE_KEYS) {
    out[k] = partial[k] ?? 0
  }
  return out
}

/** Create or update a whitelist key (phase-1 full attr edit). */
export function writeResource(data: Record<string, string>, key: ResourceKey, value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new ModuleError('INVALID_FORMAT', [key])
  data[dataKey(key)] = String(value)
}
