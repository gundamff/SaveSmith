import items from './items.json'

type ItemsJson = Record<string, { zh?: string; en?: string }>

const catalog = items as ItemsJson

export const MIN_CATALOG_ENTRIES = 50

/** True when shipped items.json is dense enough to unlock inventory editing. */
export function catalogReady(): boolean {
  const keys = Object.keys(catalog)
  if (keys.length < MIN_CATALOG_ENTRIES) return false
  const hasWeapon = keys.some((k) => k.startsWith('Weapon'))
  const hasCharm = keys.some((k) => k.startsWith('Charm_'))
  const hasSkin = keys.some((k) => k.startsWith('Skin_'))
  return hasWeapon && hasCharm && hasSkin
}

export function catalogIds(): string[] {
  return Object.keys(catalog).sort()
}
