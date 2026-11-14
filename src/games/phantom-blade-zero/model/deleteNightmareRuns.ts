import { ModuleError } from '../../../sdk/error'
import { readSlotPayload } from '../codec/container'
import type { PbzsContainer } from './types'
import {
  isEditableSlotName,
  selectSlot,
  type PbzSaveModel
} from './saveModel'
import {
  collectLineageIdsFromDocument,
  isNightmareRunSlotName,
  isNightmareSnapshotSlotName,
  nightmareSnapshotLineageId,
  pickContinueSlotFallback
} from './nightmareRunSlots'

export {
  isNightmareRunSlotName,
  isNightmareSnapshotSlotName,
  pickContinueSlotFallback
} from './nightmareRunSlots'

const CONTINUE_POINTER_KEYS = ['LastContinueSlot'] as const

export interface NightmareDeleteTarget {
  container: PbzsContainer
  model: PbzSaveModel
}

export interface DeleteNightmareRunsOptions {
  /** When omitted, delete every NightmareRun / NightmareRunN directory entry. */
  names?: readonly string[]
}

export interface DeleteNightmareRunsResult {
  deletedRunNames: string[]
  deletedSnapshotNames: string[]
  continueSlotBefore: string | null
  continueSlotAfter: string | null
}

export async function deleteNightmareRunSlots(
  state: NightmareDeleteTarget,
  options: DeleteNightmareRunsOptions = {}
): Promise<DeleteNightmareRunsResult> {
  const requested = options.names
  const runNames = state.container.slots
    .map(({ entry }) => entry.name)
    .filter((name) => {
      if (!isNightmareRunSlotName(name)) return false
      if (requested === undefined) return true
      return requested.includes(name)
    })

  if (runNames.length === 0) {
    return {
      deletedRunNames: [],
      deletedSnapshotNames: [],
      continueSlotBefore: null,
      continueSlotAfter: null
    }
  }

  const runNameSet = new Set(runNames)
  const knownLineages = new Set<string>()
  for (const { entry } of state.container.slots) {
    const lineage = nightmareSnapshotLineageId(entry.name)
    if (lineage !== null && lineage !== '') knownLineages.add(lineage)
  }

  const lineageIds = new Set<string>()
  for (const name of runNames) {
    const document = await readRunDocument(state, name)
    for (const id of collectLineageIdsFromDocument(document, knownLineages)) {
      lineageIds.add(id)
    }
  }

  const deletingAllRuns = state.container.slots
    .filter(({ entry }) => isNightmareRunSlotName(entry.name))
    .every(({ entry }) => runNameSet.has(entry.name))

  const snapshotNames = state.container.slots
    .map(({ entry }) => entry.name)
    .filter((name) => {
      if (!isNightmareSnapshotSlotName(name)) return false
      const lineage = nightmareSnapshotLineageId(name)
      if (lineage === null) return false
      if (lineage === '') {
        // Bare NightmareCycleStart / NightmareLineStart — remove when any/all runs go.
        return true
      }
      if (lineageIds.has(lineage)) return true
      // If every NightmareRun is deleted, drop remaining snapshot pairs too
      // (orphans left by missing lineage fields).
      return deletingAllRuns
    })

  const removeNames = new Set([...runNames, ...snapshotNames])
  const remaining = state.container.slots.filter(
    ({ entry }) => !removeNames.has(entry.name)
  )
  if (remaining.length < 1) {
    throw new ModuleError('PBZ_EMPTY_CONTAINER')
  }

  state.container.slots = remaining
  state.model.slots = state.model.slots.filter(
    (slot) => !runNameSet.has(slot.name)
  )

  const continueBefore = readContinueSlot(state.model.advanced?.document)
  let continueAfter: string | null = null
  if (
    continueBefore !== null &&
    removeNames.has(continueBefore) &&
    state.model.advanced
  ) {
    const fallback = pickContinueSlotFallback(
      remaining.map(({ entry }) => entry.name)
    )
    for (const key of CONTINUE_POINTER_KEYS) {
      if (key in state.model.advanced.document) {
        state.model.advanced.document[key] = fallback ?? ''
      }
    }
    // Also write LastContinueSlot when the pointer used a known key name
    // but was missing — only if we already had a continue pointer field.
    if (CONTINUE_POINTER_KEYS.some((key) => key in state.model.advanced!.document)) {
      state.model.advanced.dirty = true
    }
    continueAfter = fallback
  }

  reconcileSelectionAfterDelete(state)
  return {
    deletedRunNames: [...runNames],
    deletedSnapshotNames: [...snapshotNames],
    continueSlotBefore:
      continueBefore !== null && removeNames.has(continueBefore)
        ? continueBefore
        : null,
    continueSlotAfter:
      continueBefore !== null && removeNames.has(continueBefore)
        ? continueAfter
        : null
  }
}

async function readRunDocument(
  state: NightmareDeleteTarget,
  name: string
): Promise<unknown> {
  const editable = state.model.slots.find((slot) => slot.name === name)
  if (editable) return editable.document
  try {
    const payload = await readSlotPayload(state.container, name)
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload))
  } catch {
    return null
  }
}

function readContinueSlot(
  document: Record<string, unknown> | null | undefined
): string | null {
  if (!document) return null
  for (const key of CONTINUE_POINTER_KEYS) {
    const value = document[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function reconcileSelectionAfterDelete(state: NightmareDeleteTarget): void {
  const selected = state.model.selectedSlotName
  if (selected !== null && state.model.slots.some((slot) => slot.name === selected)) {
    return
  }
  const next = state.model.slots.find((slot) => isEditableSlotName(slot.name))
  if (next) {
    selectSlot(state.model, next.name)
  } else {
    state.model.selectedSlotName = null
  }
}
