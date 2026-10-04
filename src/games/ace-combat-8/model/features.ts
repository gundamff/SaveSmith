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

/** Bits that flip when finishing the campaign (mid-game vs cleared save delta). */
export const POST_CAMPAIGN_CLEAR_MASK =
  FEATURE_BIT.AircraftSet |
  FEATURE_BIT.Skin |
  FEATURE_BIT.Emblem |
  FEATURE_BIT.SpWeapon2ndSlot |
  FEATURE_BIT.Weathering

/**
 * Reference FeatureFlagMask from a cleared campaign save (build 25201480).
 * Includes AircraftTree / Part / Training / FreeMission / FreeFlight / DataViewer
 * plus the post-clear delta — early saves may lack AircraftTree until this is OR'd.
 */
export const CLEARED_CAMPAIGN_FEATURE_MASK = 0x3efc

export const FREE_MISSION_IDS = Array.from({ length: 31 }, (_, i) => i + 1)
export const HANGAR_SITUATION_IDS = Array.from({ length: 31 }, (_, i) => i + 1)

/**
 * UnlockedAircraftTreeNodeIDs from the cleared fixture — merge into mid-game saves
 * so post-clear unlocks can open/use the aircraft tree beyond early nodes.
 */
export const CLEARED_AIRCRAFT_TREE_NODE_IDS: readonly number[] = [
  7010, 3010, 2006802, 31010, 2015802, 27010, 2048802, 2058802, 2059802, 23010, 2036802, 2004802,
  17010, 2030802, 2049802, 2031802, 2038802, 2028802, 2003802, 2017802, 1010, 2055802, 2044802,
  2013802, 2027802, 2051802, 2008802, 8010, 2056802, 32010, 24010, 2007802, 2035802, 2012802, 20010,
  29010, 2029802, 2011802, 2001802, 2005802, 2002802, 2020802, 2010, 2032802, 2023802, 2039802,
  22010, 2034802, 2016802, 2037802, 2050802, 2026802, 15010, 2033802, 26010, 30010, 2025802, 2022802,
  2045802, 2053802, 2046802, 2018802, 12010, 4010, 2019802, 25010, 2014802, 2052802, 2010802, 5010,
  2047802, 9010, 28010, 2009802, 2021802, 21010, 10010, 2024802, 2054802, 6010, 11010, 14010, 13010,
  2057802, 2042802, 18010, 2043802, 19010, 16010, 2060802
]

export function featureMaskLabel(mask: number, locale: 'zh' | 'en'): string {
  const names = (Object.keys(FEATURE_BIT) as ELiveFeatureName[]).filter(
    (k) => k !== 'None' && (mask & FEATURE_BIT[k]) !== 0
  )
  if (names.length === 0) return locale === 'zh' ? '（无）' : '(none)'
  return names.join(', ')
}

/** Apply the full cleared-campaign feature mask (not only the clear-delta bits). */
export function mergePostCampaignFlags(current: number): number {
  return (current | CLEARED_CAMPAIGN_FEATURE_MASK) >>> 0
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
