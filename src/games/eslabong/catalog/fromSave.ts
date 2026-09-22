import type { ResourceDoc } from '../resource/binary'
import { buildLabelMaps, type LabelMaps } from './labels'
import { listFighters } from '../model/fighters'
import { listOwnedItems } from '../model/items'

export interface SaveCatalog {
  skills: string[]
  definitions: string[]
  qualities: string[]
  statIds: string[]
  labels: LabelMaps
}

export type { LabelMaps }

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set([...values].filter((s) => s.length > 0))].sort()
}

/**
 * Enumerate skills / item definitions / qualities / stat ids already present
 * in this save (edit-existing only — no external pck catalog).
 */
export function collectCatalog(doc: ResourceDoc): SaveCatalog {
  const skills = new Set<string>()
  const definitions = new Set<string>()
  const qualities = new Set<string>()
  const statIds = new Set<string>()

  for (const fighter of listFighters(doc)) {
    for (const path of Object.values(fighter.skills)) {
      if (typeof path === 'string' && path) skills.add(path)
    }
  }

  for (const item of listOwnedItems(doc)) {
    if (item.definitionId) definitions.add(item.definitionId)
    if (item.quality) qualities.add(item.quality)
    for (const line of item.stats) {
      if (line.statId) statIds.add(line.statId)
    }
  }

  return {
    skills: sortedUnique(skills),
    definitions: sortedUnique(definitions),
    qualities: sortedUnique(qualities),
    statIds: sortedUnique(statIds),
    labels: buildLabelMaps(doc)
  }
}
