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

/** Unlocks after first campaign clear (mid-game vs cleared save diff). */
export const POST_CAMPAIGN_CLEAR_MASK =
  FEATURE_BIT.AircraftSet |
  FEATURE_BIT.Skin |
  FEATURE_BIT.Emblem |
  FEATURE_BIT.SpWeapon2ndSlot |
  FEATURE_BIT.Weathering

/** Reference mask from a cleared campaign save (build 25201480). */
export const CLEARED_CAMPAIGN_FEATURE_MASK = 0x3efc

export const FREE_MISSION_IDS = Array.from({ length: 31 }, (_, i) => i + 1)

export function featureMaskLabel(mask: number, locale: 'zh' | 'en'): string {
  const names = (Object.keys(FEATURE_BIT) as ELiveFeatureName[]).filter(
    (k) => k !== 'None' && (mask & FEATURE_BIT[k]) !== 0
  )
  if (names.length === 0) return locale === 'zh' ? '（无）' : '(none)'
  return names.join(', ')
}

export function mergePostCampaignFlags(current: number): number {
  return current | POST_CAMPAIGN_CLEAR_MASK
}
