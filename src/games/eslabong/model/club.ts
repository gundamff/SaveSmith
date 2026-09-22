import { getPath, setPath, type ResourceDoc } from '../resource/binary'
import type { ClubResources } from './types'

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

export type { ClubResources } from './types'

export function readClub(doc: ResourceDoc): ClubResources {
  return {
    gold: asNumber(getPath(doc, 'player_gold')),
    renown: asNumber(getPath(doc, 'renown')),
    developmentStars: asNumber(getPath(doc, 'development_stars')),
    highestRenownReached: asNumber(getPath(doc, 'highest_renown_reached'))
  }
}

/**
 * Mutate club scalars on `doc.root` via setPath.
 * When `renown` is written, `highest_renown_reached = max(old, newRenown)` (never decreases).
 * Sidecar `gold` sync is deferred to parse/serialize.
 */
export function writeClub(doc: ResourceDoc, next: Partial<ClubResources>): void {
  if (next.gold !== undefined) {
    setPath(doc, 'player_gold', next.gold)
  }
  if (next.developmentStars !== undefined) {
    setPath(doc, 'development_stars', next.developmentStars)
  }
  if (next.renown !== undefined) {
    setPath(doc, 'renown', next.renown)
    const prevHighest = asNumber(getPath(doc, 'highest_renown_reached'))
    const nextHighest =
      next.highestRenownReached !== undefined
        ? Math.max(prevHighest, next.renown, next.highestRenownReached)
        : Math.max(prevHighest, next.renown)
    setPath(doc, 'highest_renown_reached', nextHighest)
  } else if (next.highestRenownReached !== undefined) {
    const prevHighest = asNumber(getPath(doc, 'highest_renown_reached'))
    setPath(doc, 'highest_renown_reached', Math.max(prevHighest, next.highestRenownReached))
  }
}
