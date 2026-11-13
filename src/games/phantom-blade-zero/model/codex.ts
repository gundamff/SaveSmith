import { ModuleError } from '../../../sdk/error'
import {
  getPbzCodexEnemyById,
  isWhitelistedCodexEnemyClass,
  listPbzCodexEnemies,
  pbzCodexEnemies,
  type PbzCodexEnemy
} from '../catalog/codexEnemies'
import type { PbzSaveModel } from './saveModel'

export interface PbzCodexRowView {
  id: string
  zh: string
  zhRevealed: string
  isBoss: boolean
  enemyType: string
  ownMapId: string
  enemyClass: string
  displayOrder: number
  discovered: boolean
  revealed: boolean
}

export interface PbzCodexView {
  total: number
  discoveredCount: number
  revealedCount: number
  rows: PbzCodexRowView[]
}

export function projectCodex(model: PbzSaveModel): PbzCodexView | null {
  if (!model.advanced) return null
  const { discovered, revealed } = readCodexSets(model)
  const rows = listPbzCodexEnemies().map((row) => toRowView(row, discovered, revealed))
  return {
    total: pbzCodexEnemies.length,
    discoveredCount: rows.filter((r) => r.discovered).length,
    revealedCount: rows.filter((r) => r.revealed).length,
    rows
  }
}

export function setCodexDiscovered(model: PbzSaveModel, enemyId: string, on: boolean): void {
  mutatePathList(model, 'DiscoveredEnemies', enemyId, on)
}

export function setCodexRevealed(model: PbzSaveModel, enemyId: string, on: boolean): void {
  mutatePathList(model, 'RevealedEnemies', enemyId, on)
}

export function unlockAllCodex(model: PbzSaveModel): void {
  const advanced = requireAdvanced(model)
  const codex = ensureCodex(advanced.document)
  const paths = pbzCodexEnemies.map((row) => row.enemyClass)
  codex.DiscoveredEnemies = [...paths]
  codex.RevealedEnemies = [...paths]
  advanced.dirty = true
}

export function unlockAllCodexDiscovered(model: PbzSaveModel): void {
  const advanced = requireAdvanced(model)
  const codex = ensureCodex(advanced.document)
  codex.DiscoveredEnemies = pbzCodexEnemies.map((row) => row.enemyClass)
  advanced.dirty = true
}

export function unlockAllCodexRevealed(model: PbzSaveModel): void {
  const advanced = requireAdvanced(model)
  const codex = ensureCodex(advanced.document)
  codex.RevealedEnemies = pbzCodexEnemies.map((row) => row.enemyClass)
  advanced.dirty = true
}

export function clearCodexDiscovered(model: PbzSaveModel): void {
  const advanced = requireAdvanced(model)
  const codex = ensureCodex(advanced.document)
  codex.DiscoveredEnemies = []
  advanced.dirty = true
}

export function clearCodexRevealed(model: PbzSaveModel): void {
  const advanced = requireAdvanced(model)
  const codex = ensureCodex(advanced.document)
  codex.RevealedEnemies = []
  advanced.dirty = true
}

function mutatePathList(
  model: PbzSaveModel,
  key: 'DiscoveredEnemies' | 'RevealedEnemies',
  enemyId: string,
  on: boolean
): void {
  const row = getPbzCodexEnemyById(enemyId)
  if (!row || !isWhitelistedCodexEnemyClass(row.enemyClass)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [enemyId])
  }
  const advanced = requireAdvanced(model)
  const codex = ensureCodex(advanced.document)
  const list = ensureStringArray(codex, key)
  const idx = list.findIndex((p) => p.toLowerCase() === row.enemyClass.toLowerCase())
  if (on && idx < 0) list.push(row.enemyClass)
  if (!on && idx >= 0) list.splice(idx, 1)
  advanced.dirty = true
}

function readCodexSets(model: PbzSaveModel): {
  discovered: Set<string>
  revealed: Set<string>
} {
  const advanced = model.advanced!
  const codex = asRecord(advanced.document.Codex) ?? {}
  return {
    discovered: new Set(
      readStringArray(codex.DiscoveredEnemies).map((p) => p.toLowerCase())
    ),
    revealed: new Set(readStringArray(codex.RevealedEnemies).map((p) => p.toLowerCase()))
  }
}

function toRowView(
  row: PbzCodexEnemy,
  discovered: Set<string>,
  revealed: Set<string>
): PbzCodexRowView {
  const key = row.enemyClass.toLowerCase()
  return {
    id: row.id,
    zh: row.zh,
    zhRevealed: row.zhRevealed,
    isBoss: row.isBoss,
    enemyType: row.enemyType,
    ownMapId: row.ownMapId,
    enemyClass: row.enemyClass,
    displayOrder: row.displayOrder,
    discovered: discovered.has(key),
    revealed: revealed.has(key)
  }
}

function requireAdvanced(model: PbzSaveModel) {
  if (!model.advanced) throw new ModuleError('PBZ_INVALID_EDIT', ['__Advanced__'])
  return model.advanced
}

function ensureCodex(document: Record<string, unknown>): Record<string, unknown> {
  let codex = asRecord(document.Codex)
  if (!codex) {
    codex = {
      DiscoveredEnemies: [],
      RevealedEnemies: [],
      EnemyKillMapIDs: {}
    }
    document.Codex = codex
  }
  if (!Array.isArray(codex.DiscoveredEnemies)) codex.DiscoveredEnemies = []
  if (!Array.isArray(codex.RevealedEnemies)) codex.RevealedEnemies = []
  if (!asRecord(codex.EnemyKillMapIDs)) codex.EnemyKillMapIDs = {}
  return codex
}

function ensureStringArray(
  codex: Record<string, unknown>,
  key: 'DiscoveredEnemies' | 'RevealedEnemies'
): string[] {
  if (!Array.isArray(codex[key])) codex[key] = []
  return codex[key] as string[]
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
