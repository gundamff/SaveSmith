import { itemDisplayName, hasItemName } from './itemNames'
import type { AppLocale } from '@host/i18n'

/**
 * Permanent runes (items tagged `MetaKey` in the game's item sheet). Stored as
 * plain id strings in the save's meta item arrays.
 */
export const RuneId = {
  vine: 'LadderKey',
  teleport: 'TeleportKey',
  ram: 'BreakableGroundKey',
  spider: 'WallJumpKey',
  homunculus: 'HomKey',
  customization: 'CustomKey',
  challenger: 'ScoringKey',
  explorer: 'ExploKey',
  backpack: 'BackPackKey',
  richterUppercut: 'RichterUppercutKey',
  richterDash: 'RichterDashKey'
} as const

/** Ordered rune list for the editor (core traversal runes first). */
export const RUNE_ORDER: string[] = [
  RuneId.vine,
  RuneId.teleport,
  RuneId.ram,
  RuneId.spider,
  RuneId.homunculus,
  RuneId.customization,
  RuneId.challenger,
  RuneId.explorer,
  RuneId.backpack,
  RuneId.richterUppercut,
  RuneId.richterDash
]

// Names missing from the game's own .pot (Richter Mode runes only ship a desc).
const NAME_OVERRIDES: Record<string, { en: string; zh: string }> = {
  RichterUppercutKey: { en: 'Richter Uppercut Rune', zh: '里希特·上勾拳符文' },
  RichterDashKey: { en: 'Richter Dash Rune', zh: '里希特·冲刺符文' }
}

export function runeDisplayName(id: string, locale: AppLocale): string {
  const override = NAME_OVERRIDES[id]
  if (override) return locale === 'zh' ? override.zh : override.en
  if (hasItemName(id)) return itemDisplayName(id, locale)
  return id
}

export function isKnownRune(id: string): boolean {
  return RUNE_ORDER.includes(id) || id in NAME_OVERRIDES
}
