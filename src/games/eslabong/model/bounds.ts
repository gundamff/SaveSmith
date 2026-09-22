/**
 * Static hard bounds for editable Eslabong scalars (option B).
 * Derived from live-save samples with headroom — not official game tables.
 */
import {
  FIGHTER_AI_PROFILE_KEYS,
  FIGHTER_BIRTH_KEYS,
  FIGHTER_CAREER_KEYS,
  FIGHTER_GROWTH_BASE_KEYS,
  FIGHTER_PERSONALITY_KEYS,
  MAX_EXP,
  MAX_LEVEL
} from './fields'

export interface NumBounds {
  min: number
  max: number
  /** el-input-number step; default 1 */
  step?: number
}

/** Per stat_id hard caps for rolled_modifiers / item stats.amount */
const ITEM_STAT_BOUNDS: Record<string, NumBounds> = {
  hp_flat: { min: 0, max: 200 },
  def_flat: { min: 0, max: 120 },
  man_flat: { min: 0, max: 80 },
  sta_flat: { min: 0, max: 80 },
  atk_flat: { min: 0, max: 120 },
  hp_perc: { min: 0, max: 50 },
  def_perc: { min: 0, max: 50 },
  man_perc: { min: 0, max: 50 },
  sta_perc: { min: 0, max: 50 },
  atk_perc: { min: -30, max: 50 },
  damage_perc: { min: 0, max: 50 },
  basic_damage_perc: { min: 0, max: 50 },
  damage_taken_perc: { min: -50, max: 50 },
  damage_reduction_perc: { min: 0, max: 50 },
  basic_melee_damage_taken_perc: { min: -50, max: 0 },
  projectile_damage_taken_perc: { min: -50, max: 0 },
  msp_perc: { min: -30, max: 30 },
  move_speed_perc: { min: -30, max: 30 },
  cooldown_reduction_perc: { min: 0, max: 50 },
  mana_cost_reduction_perc: { min: 0, max: 50 },
  stamina_cost_reduction_perc: { min: 0, max: 50 },
  lifesteal_perc: { min: 0, max: 20 },
  healing_done_perc: { min: 0, max: 50 },
  healing_received_perc: { min: -50, max: 50 },
  heal_max_hp_perc: { min: 0, max: 50 },
  shield_output_perc: { min: 0, max: 50 },
  shield_duration_perc: { min: 0, max: 50 },
  restore_perc: { min: 0, max: 50 },
  mana_restore: { min: 0, max: 50 },
  stamina_restore: { min: 0, max: 50 },
  dash_range_perc: { min: 0, max: 50 },
  knockback_distance_perc: { min: 0, max: 50 },
  projectile_speed_perc: { min: 0, max: 50 },
  summon_damage_perc: { min: 0, max: 50 },
  summon_hp_perc: { min: 0, max: 50 },
  skeleton_hp_perc: { min: 0, max: 300 },
  skeleton_power_perc: { min: 0, max: 300 },
  ally_radius: { min: 50, max: 400 },
  required_hits: { min: 1, max: 10 },
  hp_threshold_perc: { min: 0, max: 50 },
  duration_sec: { min: 0, max: 15, step: 0.1 },
  mark_duration_sec: { min: 0, max: 15, step: 0.1 },
  hit_window_sec: { min: 0, max: 10, step: 0.1 },
  idle_required_sec: { min: 0, max: 15, step: 0.1 },
  internal_cooldown_sec: { min: 0, max: 20, step: 0.1 }
}

const FIGHTER_FIELD_BOUNDS: Record<string, NumBounds> = {
  birth_max_hp: { min: 0, max: 3000 },
  birth_max_mana: { min: 0, max: 600 },
  birth_max_stamina: { min: 0, max: 250 },
  birth_move_speed: { min: 0, max: 200 },
  birth_defense: { min: 0, max: 150 },
  birth_damage_precise: { min: 0, max: 200 },
  growth_base_max_hp: { min: 0, max: 800 },
  growth_base_max_mana: { min: 0, max: 300 },
  growth_base_move_speed: { min: 0, max: 200 },
  growth_base_defense: { min: 0, max: 150 },
  growth_base_damage: { min: 0, max: 500 },
  career_max_hp: { min: 0, max: 5000 },
  career_max_mana: { min: 0, max: 800 },
  career_max_stamina: { min: 0, max: 250 },
  career_move_speed: { min: 0, max: 200 },
  career_defense: { min: 0, max: 200 },
  career_damage: { min: 0, max: 800 },
  career_damage_precise: { min: 0, max: 200 }
}

const TRAIT_BOUNDS: NumBounds = { min: 0, max: 1, step: 0.01 }

const PERC_FALLBACK: NumBounds = { min: -50, max: 50 }
const FLAT_FALLBACK: NumBounds = { min: -200, max: 200 }
const SEC_FALLBACK: NumBounds = { min: 0, max: 20, step: 0.1 }
const GENERIC_FALLBACK: NumBounds = { min: -500, max: 500 }

export function itemStatBounds(statId: string): NumBounds {
  if (ITEM_STAT_BOUNDS[statId]) return ITEM_STAT_BOUNDS[statId]!
  if (statId.endsWith('_perc')) return PERC_FALLBACK
  if (statId.endsWith('_flat')) return FLAT_FALLBACK
  if (statId.endsWith('_sec')) return SEC_FALLBACK
  return GENERIC_FALLBACK
}

export function fighterFieldBounds(fieldKey: string): NumBounds {
  if (FIGHTER_PERSONALITY_KEYS.includes(fieldKey as (typeof FIGHTER_PERSONALITY_KEYS)[number])) {
    return TRAIT_BOUNDS
  }
  if (FIGHTER_AI_PROFILE_KEYS.includes(fieldKey as (typeof FIGHTER_AI_PROFILE_KEYS)[number])) {
    return TRAIT_BOUNDS
  }
  if (FIGHTER_FIELD_BOUNDS[fieldKey]) return FIGHTER_FIELD_BOUNDS[fieldKey]!
  if (fieldKey.includes('max_hp')) return { min: 0, max: 5000 }
  if (fieldKey.includes('max_mana')) return { min: 0, max: 800 }
  if (fieldKey.includes('max_stamina')) return { min: 0, max: 250 }
  if (fieldKey.includes('move_speed')) return { min: 0, max: 200 }
  if (fieldKey.includes('defense')) return { min: 0, max: 200 }
  if (fieldKey.includes('damage')) return { min: 0, max: 800 }
  return GENERIC_FALLBACK
}

export function fighterLevelBounds(): NumBounds {
  return { min: 0, max: MAX_LEVEL }
}

export function fighterExpBounds(): NumBounds {
  return { min: 0, max: MAX_EXP }
}

export function injuryBattlesBounds(): NumBounds {
  return { min: 0, max: 99 }
}

export function clampToBounds(n: number, bounds: NumBounds): number {
  if (!Number.isFinite(n)) return bounds.min
  const step = bounds.step ?? 1
  let v = n
  if (step < 1) v = Math.round(v / step) * step
  else v = Math.round(v)
  return Math.max(bounds.min, Math.min(bounds.max, v))
}

export function inBounds(n: number, bounds: NumBounds): boolean {
  return Number.isFinite(n) && n >= bounds.min && n <= bounds.max
}

export function clampItemStatAmount(statId: string, amount: number): number {
  return clampToBounds(amount, itemStatBounds(statId))
}

export function clampFighterField(fieldKey: string, value: number): number {
  return clampToBounds(value, fighterFieldBounds(fieldKey))
}

/** Validate all editable fighter scalars on a row. */
export function fighterFieldInBounds(fieldKey: string, value: number): boolean {
  return inBounds(value, fighterFieldBounds(fieldKey))
}

export function itemStatInBounds(statId: string, amount: number): boolean {
  return inBounds(amount, itemStatBounds(statId))
}

/** Keys we validate on fighters (for validate()). */
export const FIGHTER_BOUND_KEYS = [
  ...FIGHTER_BIRTH_KEYS,
  ...FIGHTER_GROWTH_BASE_KEYS,
  ...FIGHTER_CAREER_KEYS,
  ...FIGHTER_PERSONALITY_KEYS,
  ...FIGHTER_AI_PROFILE_KEYS
] as const
