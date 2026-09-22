/**
 * Locked whitelist of CampaignSave root keys for club globals.
 *
 * Observed on live dump 2026-09-21 (`%APPDATA%/Godot/app_userdata/Eslabong/campaign_save_2.res`
 * via decompressRscc + parseResourceBinary), sample values:
 *   player_gold              = 8888888   (number; may reflect handtest gold)
 *   renown                   = 983587    (number)
 *   development_stars        = 99346     (number; academy/codex ledger)
 *   highest_renown_reached   = 992513    (number; never decrease on write)
 *
 * Related root keys seen but NOT in this editable whitelist (overview read-only later):
 *   player_team_name, season_count, current_week, league_week, saved_at_text,
 *   total_gold_earned, total_gold_spent, total_renown_gained, season_starting_resources, …
 *
 * Sidecar JSON `gold` must match `player_gold` on save — sync is parse/serialize (Task 7),
 * not this module.
 */
export const CLUB_KEYS = [
  'player_gold',
  'renown',
  'development_stars',
  'highest_renown_reached'
] as const

export type ClubKey = (typeof CLUB_KEYS)[number]

/**
 * Player roster root key — array of OBJECT_INTERNAL_RESOURCE refs into wire.resources.
 *
 * Observed 2026-09-21 on campaign_save_2.res: `owned_mercenaries` length 26.
 * NOT editable here: former_mercenaries, market_listings, special_free_agents,
 * challenge_tower / online_arena / reserve academy rosters (opaque passthrough).
 */
export const FIGHTER_ROSTER_PATH = 'owned_mercenaries' as const

/**
 * Progress caps for maxProgress until a formal catalog exists.
 * Live dump (same save): roster levels mostly 43 (max observed 43); experience max 1380.
 * Caps keep a small headroom above the observed soft ceiling without absurd values.
 */
export const MAX_LEVEL = 50
export const MAX_EXP = 5000

/** Mercenary instance identity / display (on the fighter Resource). */
export const FIGHTER_ID_KEY = 'instance_id' as const

/** UUID strings of equipped relic instances (typically 2 slots). */
export const FIGHTER_EQUIPPED_ITEM_IDS_KEY = 'equipped_item_instance_ids' as const
export const FIGHTER_DISPLAY_NAME_KEY = 'display_name' as const
export const FIGHTER_LEVEL_KEY = 'level' as const
export const FIGHTER_EXPERIENCE_KEY = 'experience' as const
export const FIGHTER_GROWTH_STYLES_KEY = 'growth_styles' as const

/**
 * Skills live as a string array `active_abilities` (res://… paths), NOT skill_01 props
 * (skill_01 absent from string table / all resources on the dump).
 * Projected to FighterRow.skills as skill_01..skill_0N; apply writes active_abilities
 * and mirrors ability_hotkey_slots when that prop exists.
 */
export const FIGHTER_ACTIVE_ABILITIES_KEY = 'active_abilities' as const
export const FIGHTER_ABILITY_HOTKEY_SLOTS_KEY = 'ability_hotkey_slots' as const

/** Injury fields on the fighter Resource (dump: is_injured, not `injured`). */
export const FIGHTER_INJURED_KEY = 'is_injured' as const
export const FIGHTER_INJURY_BATTLES_KEY = 'injury_battles_remaining' as const
export const FIGHTER_INJURY_DESCRIPTION_KEY = 'injury_description' as const

/**
 * Nested AI / personality Resource referenced by ai_profile_override (OBJECT_INTERNAL).
 * Personality + aiProfile scalars are read/written on that target Resource.
 */
export const FIGHTER_AI_PROFILE_KEY = 'ai_profile_override' as const

/** birth_* scalars observed on owned mercenaries. */
export const FIGHTER_BIRTH_KEYS = [
  'birth_damage_precise',
  'birth_defense',
  'birth_max_hp',
  'birth_max_mana',
  'birth_max_stamina',
  'birth_move_speed'
] as const

/** growth_base_* scalars (no growth_base_max_stamina on dump). */
export const FIGHTER_GROWTH_BASE_KEYS = [
  'growth_base_damage',
  'growth_base_defense',
  'growth_base_max_hp',
  'growth_base_max_mana',
  'growth_base_move_speed'
] as const

/** Numeric career_* stats only (excludes career_medal_* / loadout flags). */
export const FIGHTER_CAREER_KEYS = [
  'career_damage',
  'career_damage_precise',
  'career_defense',
  'career_max_hp',
  'career_max_mana',
  'career_max_stamina',
  'career_move_speed'
] as const

/** Personality-leaning doubles on the ai_profile_override Resource. */
export const FIGHTER_PERSONALITY_KEYS = [
  'adaptability',
  'teamwork_affinity',
  'revenge_factor',
  'showmanship',
  'situational_awareness',
  'overconfidence'
] as const

/** Combat-tendency doubles on the same ai_profile_override Resource. */
export const FIGHTER_AI_PROFILE_KEYS = [
  'aggression',
  'mistake_chance',
  'block_chance',
  'dodge_chance',
  'parry_mastery'
] as const

/**
 * Player-owned item instances root key — array of OBJECT_INTERNAL_RESOURCE refs.
 *
 * Observed 2026-09-21 on campaign_save_2.res: `owned_item_instances` length 45.
 * NOT editable here: market_listings, item_local_market_listings, item_union_stock,
 * item_reward_overflow, challenge tower / PVP stores (opaque passthrough).
 */
export const ITEM_ROSTER_PATH = 'owned_item_instances' as const

/** Identity / definition on each owned item Resource. */
export const ITEM_INSTANCE_ID_KEY = 'instance_id' as const
export const ITEM_DEFINITION_ID_KEY = 'definition_id' as const

/** When equipped: fighter instance_id + slot index (0/1); -1 when in inventory. */
export const ITEM_EQUIPPED_FIGHTER_KEY = 'equipped_fighter_id' as const
export const ITEM_EQUIPPED_SLOT_KEY = 'equipped_slot' as const
export const ITEM_INVENTORY_SLOT_KEY = 'inventory_slot' as const

/**
 * Optional string quality. Absent from live dump string table / all owned items
 * (2026-09-21); kept for forward-compat and synthetic fixtures. applyItem writes
 * it only when the property already exists on the instance.
 */
export const ITEM_QUALITY_KEY = 'quality' as const

/** Bool flag observed on every owned item (dump: exceptional_roll). */
export const ITEM_EXCEPTIONAL_ROLL_KEY = 'exceptional_roll' as const

/**
 * Dictionary of roll affix id → number (dump: rolled_modifiers).
 * e.g. { hp_flat: 47, basic_melee_damage_taken_perc: -16 }.
 * Projected to ItemRow.stats as { statId, amount, ratio: 0 }.
 */
export const ITEM_ROLLED_MODIFIERS_KEY = 'rolled_modifiers' as const

/**
 * Optional stats[] array (stat_id / amount / ratio / display_value).
 * Not present on live dump; when present, preferred over rolled_modifiers projection.
 */
export const ITEM_STATS_KEY = 'stats' as const
