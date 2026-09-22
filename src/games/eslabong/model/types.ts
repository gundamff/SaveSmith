import type { ResValue } from '../resource/binary'

/** Club-level editable scalars projected from CampaignSave root. */
export interface ClubResources {
  gold: number
  renown: number
  developmentStars: number
  highestRenownReached: number
}

/**
 * Projection of one owned mercenary (edit existing only).
 * skills: skill_01.. from active_abilities[]; _ref holds wire resource index for apply.
 */
export interface FighterRow {
  id: string
  displayName: string
  /** res://Data/Mercenaries/... config path — used for 职业 column */
  configId: string
  level: number
  experience: number
  growthStyles: ResValue
  birth: Record<string, number>
  growthBase: Record<string, number>
  career: Record<string, number>
  personality: Record<string, number>
  aiProfile: Record<string, number>
  skills: Record<string, string>
  injured: boolean
  injuryBattlesRemaining: number
  injuryDescription: string
  /** equipped relic instance UUIDs (slot order); empty string = empty slot */
  equippedItemInstanceIds: string[]
  /** opaque mirror for unlisted props on this instance */
  _ref: unknown
}

/** One roll / affix line on an owned item. */
export interface ItemStatLine {
  statId: string
  amount: number
  ratio: number
  displayValue?: string
}

/**
 * Projection of one owned item instance (edit existing only).
 * Live dump stores affixes in rolled_modifiers dict; stats[] is optional / projected.
 * _ref holds wire resource index for apply.
 */
export interface ItemRow {
  instanceId: string
  definitionId: string
  quality: string
  exceptionalRoll?: boolean
  equippedFighterId: string
  equippedSlot: number
  inventorySlot: number
  rolledModifiers: ResValue
  stats: ItemStatLine[]
  _ref: unknown
}
