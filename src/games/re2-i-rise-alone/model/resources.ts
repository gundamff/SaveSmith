import { ModuleError } from '@sdk/error'

export const RESOURCE_KEYS = [
  'Money',
  'Stamina',
  'Charm',
  'Wisdom',
  'Execution',
  'Morality',
  'Pressure'
] as const
export type ResourceKey = (typeof RESOURCE_KEYS)[number]

export function dataKey(k: ResourceKey): string {
  return `property_Property_${k}`
}

export function readResources(data: Record<string, string>): Partial<Record<ResourceKey, number>> {
  const out: Partial<Record<ResourceKey, number>> = {}
  for (const k of RESOURCE_KEYS) {
    const raw = data[dataKey(k)]
    if (raw === undefined) continue
    if (!/^-?\d+$/.test(raw)) continue
    out[k] = Number(raw)
  }
  return out
}

export function writeResource(
  data: Record<string, string>,
  key: ResourceKey,
  value: number
): void {
  const dk = dataKey(key)
  if (!(dk in data)) throw new ModuleError('MISSING_FIELD', [key])
  if (!Number.isInteger(value) || value < 0) throw new ModuleError('INVALID_FORMAT', [key])
  data[dk] = String(value)
}