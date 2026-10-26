import { arcanaCatalog } from '../catalog/arcana'
import type { BelmontsCurseState } from './types'
import { addItem } from './inventory'
import { refreshViews } from './saveModel'
import { ModuleError } from '@sdk/error'

/** Observed max step for absorbed Arcana in real saves (Leon=4). */
export const ARCANA_ABSORBED_STEP = 4

function playerSave(state: BelmontsCurseState): Record<string, unknown> {
  const ps = state.raw.playerSave
  if (!ps || typeof ps !== 'object' || Array.isArray(ps)) {
    throw new ModuleError('MISSING_FIELD', ['playerSave'])
  }
  return ps as Record<string, unknown>
}

function readGuidDict(raw: unknown): { keys: string[]; values: number[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { keys: [], values: [] }
  }
  const d = raw as Record<string, unknown>
  const keys = Array.isArray(d.m_keys) ? d.m_keys.filter((x): x is string => typeof x === 'string') : []
  const values = Array.isArray(d.m_values)
    ? d.m_values.map((x) => {
        const n = Number(x)
        return Number.isFinite(n) ? n : 0
      })
    : []
  return { keys, values }
}

function writeGuidDict(ps: Record<string, unknown>, keys: string[], values: number[]): void {
  ps.characterProgressionSteps = { m_keys: keys, m_values: values }
}

/**
 * Unlock every catalog Arcana: set characterProgressionSteps to absorbed,
 * append linked spells to inventory, append vania move GUIDs.
 * Clears unconsultedTarotArcana to avoid a notification queue.
 * Returns how many Arcana were newly raised to absorbed (0 if already complete).
 */
export function unlockAllArcana(state: BelmontsCurseState): number {
  const catalog = arcanaCatalog()
  if (catalog.length === 0) return 0
  const ps = playerSave(state)
  const { keys, values } = readGuidDict(ps.characterProgressionSteps)
  const byGuid = new Map<string, number>()
  for (let i = 0; i < keys.length; i++) {
    byGuid.set(keys[i]!, values[i] ?? 0)
  }

  let newly = 0
  const vania = new Set(
    (Array.isArray(ps.vaniaMoves) ? ps.vaniaMoves : []).filter((x): x is string => typeof x === 'string')
  )

  for (const entry of catalog) {
    const prev = byGuid.get(entry.characterGuid) ?? 0
    if (prev < ARCANA_ABSORBED_STEP) newly += 1
    byGuid.set(entry.characterGuid, Math.max(prev, ARCANA_ABSORBED_STEP))
    if (entry.spellItemID) addItem(state, entry.spellItemID)
    if (entry.vaniaGuid) vania.add(entry.vaniaGuid)
  }
  ps.vaniaMoves = [...vania]

  const outKeys = [...byGuid.keys()].sort()
  const outValues = outKeys.map((g) => byGuid.get(g) ?? ARCANA_ABSORBED_STEP)
  writeGuidDict(ps, outKeys, outValues)
  ps.unconsultedTarotArcana = []
  ps.unconsultedFoundBeforeHintedTarotArcana = []
  refreshViews(state)
  return newly
}
