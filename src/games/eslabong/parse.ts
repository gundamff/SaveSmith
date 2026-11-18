import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { applyIntegrityFields } from './integrity'
import { readClub, writeClub } from './model/club'
import { applyFighter, listFighters } from './model/fighters'
import {
  fighterExpBounds,
  fighterFieldInBounds,
  fighterLevelBounds,
  injuryBattlesBounds,
  itemStatInBounds
} from './model/bounds'
import {
  FIGHTER_AI_PROFILE_KEYS,
  FIGHTER_BIRTH_KEYS,
  FIGHTER_CAREER_KEYS,
  FIGHTER_GROWTH_BASE_KEYS,
  FIGHTER_PERSONALITY_KEYS
} from './model/fields'
import { applyItem, listOwnedItems } from './model/items'
import type { ClubResources, FighterRow, ItemRow } from './model/types'
import {
  parseResourceBinary,
  serializeResourceBinary,
  type ResourceDoc
} from './resource/binary'
import { compressRscc, decompressRscc } from './rscc'
import { parseSidecarBytes } from './sidecar'

export interface FighterBoundSnapshot {
  id: string
  level: number
  experience: number
  injuryBattlesRemaining: number
  birth: Record<string, number>
  growthBase: Record<string, number>
  career: Record<string, number>
  personality: Record<string, number>
  aiProfile: Record<string, number>
}

export interface ItemBoundSnapshot {
  instanceId: string
  stats: Array<{ statId: string; amount: number }>
}

export interface EslabongState {
  sidecar: Record<string, unknown>
  sidecarPath: string
  resPath: string
  resPlain: ResourceDoc
  club: ClubResources
  fighters: FighterRow[]
  items: ItemRow[]
  fighterBaseline: FighterBoundSnapshot[]
  itemBaseline: ItemBoundSnapshot[]
  writeEnabled: boolean
  originalResBytes: Uint8Array
  originalSidecarBytes: Uint8Array
}

function snapshotFighter(row: FighterRow): FighterBoundSnapshot {
  return {
    id: row.id,
    level: row.level,
    experience: row.experience,
    injuryBattlesRemaining: row.injuryBattlesRemaining,
    birth: { ...row.birth },
    growthBase: { ...row.growthBase },
    career: { ...row.career },
    personality: { ...row.personality },
    aiProfile: { ...row.aiProfile }
  }
}

function snapshotItem(row: ItemRow): ItemBoundSnapshot {
  return {
    instanceId: row.instanceId,
    stats: row.stats.map((line) => ({ statId: line.statId, amount: line.amount }))
  }
}

function sameRecord(left: Record<string, number>, right: Record<string, number> | undefined): boolean {
  if (!right) return false
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (left[key] !== right[key]) return false
  }
  return true
}

function unchanged(current: number, baseline: number | undefined): boolean {
  return baseline !== undefined && current === baseline
}

function fighterViolations(row: FighterRow, base: FighterBoundSnapshot | undefined): string[] {
  const matched = base !== undefined && base.id === row.id
  const bad: string[] = []
  const levelBounds = fighterLevelBounds()
  const expBounds = fighterExpBounds()
  const injuryBounds = injuryBattlesBounds()
  const scalars: Array<[string, number, number | undefined]> = [
    ['level', row.level, matched ? base!.level : undefined],
    ['experience', row.experience, matched ? base!.experience : undefined],
    ['injuryBattlesRemaining', row.injuryBattlesRemaining, matched ? base!.injuryBattlesRemaining : undefined]
  ]
  const ranges: Record<string, { min: number; max: number }> = {
    level: levelBounds,
    experience: expBounds,
    injuryBattlesRemaining: injuryBounds
  }
  for (const [key, value, baseline] of scalars) {
    const range = ranges[key]!
    const legal = Number.isFinite(value) && value >= range.min && value <= range.max
    if (!legal && !unchanged(value, baseline)) bad.push(key)
  }
  const groups: Array<[readonly string[], Record<string, number>, Record<string, number> | undefined]> = [
    [FIGHTER_BIRTH_KEYS, row.birth, matched ? base!.birth : undefined],
    [FIGHTER_GROWTH_BASE_KEYS, row.growthBase, matched ? base!.growthBase : undefined],
    [FIGHTER_CAREER_KEYS, row.career, matched ? base!.career : undefined],
    [FIGHTER_PERSONALITY_KEYS, row.personality, matched ? base!.personality : undefined],
    [FIGHTER_AI_PROFILE_KEYS, row.aiProfile, matched ? base!.aiProfile : undefined]
  ]
  for (const [keys, values, baseline] of groups) {
    for (const key of keys) {
      const value = values[key]
      if (value === undefined) continue
      if (fighterFieldInBounds(key, value)) continue
      if (matched && sameRecord({ [key]: value }, baseline && baseline[key] !== undefined ? { [key]: baseline[key] } : undefined)) {
        continue
      }
      bad.push(key)
    }
  }
  return bad
}

function basename(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? relativePath
}

function isCampaignJson(path: string): boolean {
  return /^campaign_(save_\d+|autosave(_\d+)?)\.json$/i.test(basename(path))
}

function resPathFor(jsonPath: string): string {
  return jsonPath.replace(/\.json$/i, '.res')
}

function findByBasename(files: SlotBytes[], name: string): SlotBytes | undefined {
  const lower = name.toLowerCase()
  return files.find((f) => basename(f.relativePath).toLowerCase() === lower)
}

function parseSidecarObject(bytes: Uint8Array): Record<string, unknown> {
  const summary = parseSidecarBytes(bytes)
  if (!summary) throw new ModuleError('MISSING_FIELD', ['team_name'])
  let doc: unknown
  try {
    doc = JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    throw new ModuleError('PARSE_FAILED', ['sidecar'])
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new ModuleError('PARSE_FAILED', ['sidecar'])
  }
  return doc as Record<string, unknown>
}

function finiteNonNeg(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

export async function parse(files: SlotBytes[]): Promise<EslabongState> {
  const json = files.find((f) => isCampaignJson(f.relativePath))
  if (!json) throw new ModuleError('MISSING_FIELD', ['campaign_*.json'])

  const sidecarPath = json.relativePath
  const expectedRes = resPathFor(sidecarPath)
  const res =
    findByBasename(files, basename(expectedRes)) ??
    files.find((f) => /\.res$/i.test(basename(f.relativePath)))
  if (!res) throw new ModuleError('MISSING_FIELD', [basename(expectedRes)])

  const sidecar = parseSidecarObject(json.bytes)

  let plain: Uint8Array
  try {
    plain = await decompressRscc(res.bytes)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('PARSE_FAILED', ['rscc'])
  }

  let resPlain: ResourceDoc
  try {
    resPlain = parseResourceBinary(plain)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('PARSE_FAILED', ['resource'])
  }

  const fighters = listFighters(resPlain)
  const items = listOwnedItems(resPlain)

  return {
    sidecar,
    sidecarPath,
    resPath: res.relativePath,
    resPlain,
    club: readClub(resPlain),
    fighters,
    items,
    fighterBaseline: fighters.map(snapshotFighter),
    itemBaseline: items.map(snapshotItem),
    writeEnabled: true,
    originalResBytes: res.bytes,
    originalSidecarBytes: json.bytes
  }
}

export async function serialize(state: EslabongState): Promise<SerializedFile[]> {
  if (!state.writeEnabled) {
    throw new ModuleError('INTEGRITY_UNAVAILABLE', [])
  }

  writeClub(state.resPlain, state.club)
  for (const row of state.fighters) applyFighter(state.resPlain, row)
  for (const row of state.items) applyItem(state.resPlain, row)

  let plain: Uint8Array
  try {
    plain = serializeResourceBinary(state.resPlain)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('SERIALIZE_FAILED', ['resource'])
  }

  let resBytes: Uint8Array
  try {
    resBytes = await compressRscc(plain)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('SERIALIZE_FAILED', ['rscc'])
  }

  const sidecar: Record<string, unknown> = {
    ...state.sidecar,
    gold: state.club.gold
  }

  let nextSidecar: Record<string, unknown>
  try {
    nextSidecar = applyIntegrityFields(sidecar, resBytes)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('INTEGRITY_UNAVAILABLE', [])
  }

  return [
    {
      relativePath: state.sidecarPath,
      bytes: new TextEncoder().encode(JSON.stringify(nextSidecar))
    },
    {
      relativePath: state.resPath,
      bytes: resBytes
    }
  ]
}

export function validate(state: EslabongState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { club } = state

  if (
    !finiteNonNeg(club.gold) ||
    !finiteNonNeg(club.renown) ||
    !finiteNonNeg(club.developmentStars) ||
    !finiteNonNeg(club.highestRenownReached)
  ) {
    issues.push({ code: 'INVALID_CLUB', args: [] })
  }

  for (let i = 0; i < state.fighters.length; i++) {
    const row = state.fighters[i]!
    const bad = fighterViolations(row, state.fighterBaseline?.[i])
    if (bad.length > 0) {
      issues.push({ code: 'INVALID_FIGHTER', args: [i, row.id || row.displayName, bad.join(',')] })
    }
  }

  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i]!
    const base = state.itemBaseline?.[i]
    const matched = base !== undefined && base.instanceId === item.instanceId
    const bad: string[] = []
    for (let lineIndex = 0; lineIndex < item.stats.length; lineIndex++) {
      const line = item.stats[lineIndex]!
      if (line.statId && itemStatInBounds(line.statId, line.amount)) continue
      const previous = matched ? base!.stats[lineIndex] : undefined
      if (previous && previous.statId === line.statId && previous.amount === line.amount) continue
      bad.push(line.statId || `stats[${lineIndex}]`)
    }
    if (bad.length > 0) {
      issues.push({
        code: 'INVALID_ITEM',
        args: [i, item.definitionId || item.instanceId, bad.join(',')]
      })
    }
  }

  return issues
}
