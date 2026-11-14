/** 66-days / NightmareRun directory slot names (with or without trailing digits). */
const NIGHTMARE_RUN_SLOT = /^NightmareRun\d*$/

/** Paired snapshots loaded via LoadNightmareCycleStartById / LoadNightmareLineStartById. */
const NIGHTMARE_SNAPSHOT_SLOT =
  /^(?:NightmareCycleStart|NightmareLineStart)(?:_(.+))?$/

const AUTO_SAVE_SLOT = /^AutoSave\d+$/
const MANUAL_SAVE_SLOT = /^ManualSave\d+$/

export function isNightmareRunSlotName(name: string): boolean {
  return NIGHTMARE_RUN_SLOT.test(name)
}

export function isNightmareSnapshotSlotName(name: string): boolean {
  return NIGHTMARE_SNAPSHOT_SLOT.test(name)
}

export function nightmareSnapshotLineageId(name: string): string | null {
  const match = name.match(NIGHTMARE_SNAPSHOT_SLOT)
  if (!match) return null
  return match[1] ?? ''
}

export function isAutoSaveSlotName(name: string): boolean {
  return AUTO_SAVE_SLOT.test(name)
}

export function isManualSaveSlotName(name: string): boolean {
  return MANUAL_SAVE_SLOT.test(name)
}

/**
 * Prefer a remaining ManualSave, then AutoSave, then any remaining NightmareRun.
 * Returns null when nothing loadable remains.
 */
export function pickContinueSlotFallback(
  remainingSlotNames: readonly string[]
): string | null {
  const manual = remainingSlotNames.filter(isManualSaveSlotName)
  if (manual.length > 0) return pickHighestIndex(manual, 'ManualSave')

  const auto = remainingSlotNames.filter(isAutoSaveSlotName)
  if (auto.length > 0) return pickHighestIndex(auto, 'AutoSave')

  const nightmare = remainingSlotNames.filter(isNightmareRunSlotName)
  if (nightmare.length > 0) return pickHighestIndex(nightmare, 'NightmareRun')

  return null
}

function pickHighestIndex(names: readonly string[], prefix: string): string {
  let best = names[0]!
  let bestIndex = -1
  for (const name of names) {
    const suffix = name.slice(prefix.length)
    const index = suffix === '' ? -1 : Number(suffix)
    if (!Number.isFinite(index)) continue
    if (index >= bestIndex) {
      bestIndex = index
      best = name
    }
  }
  return best
}

/** Collect NightmareLineageId values and any string that matches a known lineage. */
export function collectLineageIdsFromDocument(
  document: unknown,
  knownLineageIds: ReadonlySet<string>
): Set<string> {
  const found = new Set<string>()
  walk(document, (value, key) => {
    if (typeof value !== 'string' || value.length === 0) return
    if (key === 'NightmareLineageId') found.add(value)
    if (knownLineageIds.has(value)) found.add(value)
  })
  return found
}

function walk(
  value: unknown,
  visit: (value: unknown, key: string | null) => void,
  key: string | null = null
): void {
  visit(value, key)
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit, key)
    return
  }
  if (typeof value !== 'object' || value === null) return
  for (const [childKey, child] of Object.entries(value)) {
    walk(child, visit, childKey)
  }
}
