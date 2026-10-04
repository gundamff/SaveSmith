import reference100pct from '../data/reference-100pct-snapshot.json'

/** ELiveFeature bit order from AceCombat8.exe string table. */
export const ELiveFeature = {
  None: 0,
  AceDifficulty: 1,
  AircraftSet: 2,
  AircraftTree: 3,
  Skin: 4,
  Emblem: 5,
  Part: 6,
  Training: 7,
  MusicPlayer: 8,
  SpWeapon2ndSlot: 9,
  Weathering: 10,
  FreeMission: 11,
  FreeFlight: 12,
  DataViewer: 13
} as const

export type ELiveFeatureName = keyof typeof ELiveFeature

const FEATURE_BIT: Record<ELiveFeatureName, number> = {
  None: 0,
  AceDifficulty: 1 << ELiveFeature.AceDifficulty,
  AircraftSet: 1 << ELiveFeature.AircraftSet,
  AircraftTree: 1 << ELiveFeature.AircraftTree,
  Skin: 1 << ELiveFeature.Skin,
  Emblem: 1 << ELiveFeature.Emblem,
  Part: 1 << ELiveFeature.Part,
  Training: 1 << ELiveFeature.Training,
  MusicPlayer: 1 << ELiveFeature.MusicPlayer,
  SpWeapon2ndSlot: 1 << ELiveFeature.SpWeapon2ndSlot,
  Weathering: 1 << ELiveFeature.Weathering,
  FreeMission: 1 << ELiveFeature.FreeMission,
  FreeFlight: 1 << ELiveFeature.FreeFlight,
  DataViewer: 1 << ELiveFeature.DataViewer
}

export const ACE_DIFFICULTY_BIT = FEATURE_BIT.AceDifficulty

/** Bits that flip when finishing the campaign (mid-game vs cleared save delta). */
export const POST_CAMPAIGN_CLEAR_MASK =
  FEATURE_BIT.AircraftSet |
  FEATURE_BIT.Skin |
  FEATURE_BIT.Emblem |
  FEATURE_BIT.SpWeapon2ndSlot |
  FEATURE_BIT.Weathering

/** Ordinary cleared-save mask (without AceDifficulty). */
export const CLEARED_CAMPAIGN_FEATURE_MASK = 0x3efc

/**
 * Fuller unlock mask from the local 100% reference snapshot (`0x3EFE` = cleared + AceDifficulty).
 * MenuMiscFlag NewAceDifficulty is optional UI chrome; 100% saves often omit it.
 */
export const FULL_UNLOCK_FEATURE_MASK = reference100pct.featureFlagMask as number

export const FREE_MISSION_IDS = Array.from({ length: 31 }, (_, i) => i + 1)
export const HANGAR_SITUATION_IDS = Array.from({ length: 31 }, (_, i) => i + 1)

function idsOf(name: keyof typeof reference100pct.arrays): readonly number[] {
  const a = reference100pct.arrays[name]
  if (!a) throw new Error(`missing snapshot array ${name}`)
  return a.ids
}

export const REF_AIRCRAFT_TREE_NODE_IDS = idsOf('UnlockedAircraftTreeNodeIDs')
export const REF_SKIN_IDS = idsOf('UnlockedSkinIdList')
export const REF_EMBLEM_IDS = idsOf('UnlockedEmblemIdList')
export const REF_MEDAL_IDS = idsOf('UnlockedMedalIdList')

/** @deprecated use REF_AIRCRAFT_TREE_NODE_IDS */
export const CLEARED_AIRCRAFT_TREE_NODE_IDS = REF_AIRCRAFT_TREE_NODE_IDS

export function featureMaskLabel(mask: number, locale: 'zh' | 'en'): string {
  const names = (Object.keys(FEATURE_BIT) as ELiveFeatureName[]).filter(
    (k) => k !== 'None' && (mask & FEATURE_BIT[k]) !== 0
  )
  if (names.length === 0) return locale === 'zh' ? '（无）' : '(none)'
  return names.join(', ')
}

/** OR the 100%-aligned full unlock mask (includes AceDifficulty). */
export function mergePostCampaignFlags(current: number): number {
  return (current | FULL_UNLOCK_FEATURE_MASK) >>> 0
}

export function mergeUniqueIds(current: number[], extra: readonly number[]): number[] {
  const seen = new Set(current)
  const out = current.slice()
  for (const id of extra) {
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

export function hasFeatureBit(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0
}
