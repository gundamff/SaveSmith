import { ModuleError } from '@sdk/error'
import type {
  BelmontsCurseState,
  ExplorationView,
  PlayerScalarKey,
  PlayerView
} from './types'

export type { BelmontsCurseState } from './types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function readNumber(v: unknown): number {
  return Number(v)
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function projectExploration(raw: Record<string, unknown>): ExplorationView {
  const ws = raw.worldSaves
  if (!isRecord(ws)) {
    return { worldKeyCount: 0, completionItemCount: 0, entityCount: 0 }
  }
  const worldKeyCount = Array.isArray(ws.m_keys) ? ws.m_keys.length : 0
  let completionItemCount = 0
  let entityCount = 0
  if (Array.isArray(ws.m_values)) {
    for (const entry of ws.m_values) {
      if (!isRecord(entry)) continue
      const cc = readNumber(entry.currentCompletionItemCount)
      if (Number.isFinite(cc)) completionItemCount += cc
      const ses = entry.savableEntityStates
      if (isRecord(ses) && Array.isArray(ses.m_keys)) {
        entityCount += ses.m_keys.length
      }
    }
  }
  return { worldKeyCount, completionItemCount, entityCount }
}

function projectPlayer(raw: Record<string, unknown>, playerSave: Record<string, unknown>): PlayerView {
  const version = readString(raw.version)
  return {
    id: readString(playerSave.id),
    saveDate: readString(playerSave.saveDate),
    playTimeInSeconds: readNumber(playerSave.playTimeInSeconds),
    version,
    level: readNumber(playerSave.level),
    experienceCurrent: readNumber(playerSave.experienceCurrent),
    healthUpgradeFragmentCount: readNumber(playerSave.healthUpgradeFragmentCount),
    manaUpgradeFragmentCount: readNumber(playerSave.manaUpgradeFragmentCount),
    atkBonusUpgradeCount: readNumber(playerSave.atkBonusUpgradeCount),
    defBonusUpgradeCount: readNumber(playerSave.defBonusUpgradeCount),
    currentHealth: readNumber(playerSave.currentHealth),
    currentMana: readNumber(playerSave.currentMana),
    currentHealChargesCount: readNumber(playerSave.currentHealChargesCount),
    currentTheHermitDeathDefianceCount: readNumber(playerSave.currentTheHermitDeathDefianceCount),
    itemsInInventory: readStringArray(playerSave.itemsInInventory),
    equippedWeaponItem: readString(playerSave.equippedWeaponItem),
    equippedSpellItem: readString(playerSave.equippedSpellItem),
    equippedSkin: readString(playerSave.equippedSkin),
    equippedCharmItems: readStringArray(playerSave.equippedCharmItems),
    vaniaMoves: readStringArray(playerSave.vaniaMoves),
    progressionPersistentSave: readStringArray(playerSave.progressionPersistentSave),
    arcanaCompletedTasks: readStringArray(playerSave.arcanaCompletedTasks),
    arcanaUnlockedTalents: readStringArray(playerSave.arcanaUnlockedTalents)
  }
}

export function projectState(raw: Record<string, unknown>, relativePath: string): BelmontsCurseState {
  const playerSave = raw.playerSave
  if (!isRecord(playerSave)) {
    throw new ModuleError('MISSING_FIELD', ['playerSave'])
  }
  return {
    relativePath,
    raw,
    player: projectPlayer(raw, playerSave),
    exploration: projectExploration(raw)
  }
}

export function refreshViews(state: BelmontsCurseState): void {
  const playerSave = state.raw.playerSave
  if (!isRecord(playerSave)) {
    throw new ModuleError('MISSING_FIELD', ['playerSave'])
  }
  state.player = projectPlayer(state.raw, playerSave)
  state.exploration = projectExploration(state.raw)
}

export function setPlayerScalar(
  state: BelmontsCurseState,
  key: PlayerScalarKey,
  value: number
): void {
  state.player[key] = value
  const playerSave = state.raw.playerSave
  if (!isRecord(playerSave)) {
    throw new ModuleError('MISSING_FIELD', ['playerSave'])
  }
  playerSave[key] = value
}
