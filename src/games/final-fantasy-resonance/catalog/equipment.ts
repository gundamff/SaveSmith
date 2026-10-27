import equipmentJson from './equipment.json'
import { catalogLabel } from './names'

export type EquipKind = 'weapon' | 'armor' | 'accessory'

export interface EquipEntry {
  id: number
  kind: EquipKind
  subtype: number
  en: string
}

/** Armor subtypes each base unit may wear (from public save-editor format notes). */
const ARMOR_OK: Record<number, number[]> = {
  1001: [9, 10],
  1002: [9, 10],
  1003: [10, 11],
  1004: [9, 10],
  1005: [10, 11],
  1006: [10, 11],
  1007: [9, 10],
  1008: [10, 11]
}

const ALL = equipmentJson as EquipEntry[]
const byId = new Map(ALL.map((e) => [e.id, e]))

export function getEquip(id: number): EquipEntry | undefined {
  return byId.get(id)
}

/** Base party 1001–1008 → weapon id prefix 101–108. Others: follow current weapon prefix if any. */
export function weaponPrefixForUnit(unitId: number, currentWeaponId?: number): number | null {
  if (unitId >= 1001 && unitId <= 1008) return 101 + (unitId - 1001)
  if (currentWeaponId && currentWeaponId > 0) return Math.floor(currentWeaponId / 100)
  return null
}

export function allowedWeapons(unitId: number, currentWeaponId: number): EquipEntry[] {
  const pre = weaponPrefixForUnit(unitId, currentWeaponId)
  if (pre == null) {
    return ALL.filter((e) => e.kind === 'weapon')
  }
  return ALL.filter((e) => e.kind === 'weapon' && Math.floor(e.id / 100) === pre)
}

export function allowedArmors(unitId: number): EquipEntry[] {
  const ok = ARMOR_OK[unitId] ?? [9, 10, 11]
  return ALL.filter((e) => e.kind === 'armor' && ok.includes(e.subtype))
}

export function equipOptionLabel(id: number, locale: 'zh' | 'en'): string {
  if (id <= 0) return locale === 'zh' ? '（空）' : '(none)'
  return catalogLabel('item', id, locale, true)
}
