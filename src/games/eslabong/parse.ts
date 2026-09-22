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

export interface EslabongState {
  sidecar: Record<string, unknown>
  sidecarPath: string
  resPath: string
  resPlain: ResourceDoc
  club: ClubResources
  fighters: FighterRow[]
  items: ItemRow[]
  writeEnabled: boolean
  originalResBytes: Uint8Array
  originalSidecarBytes: Uint8Array
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

  return {
    sidecar,
    sidecarPath,
    resPath: res.relativePath,
    resPlain,
    club: readClub(resPlain),
    fighters: listFighters(resPlain),
    items: listOwnedItems(resPlain),
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

  const levelBounds = fighterLevelBounds()
  const expBounds = fighterExpBounds()
  const injuryBounds = injuryBattlesBounds()

  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i]!
    let bad = false
    if (
      !Number.isFinite(f.level) ||
      f.level < levelBounds.min ||
      f.level > levelBounds.max ||
      !Number.isFinite(f.experience) ||
      f.experience < expBounds.min ||
      f.experience > expBounds.max ||
      !Number.isFinite(f.injuryBattlesRemaining) ||
      f.injuryBattlesRemaining < injuryBounds.min ||
      f.injuryBattlesRemaining > injuryBounds.max
    ) {
      bad = true
    }
    for (const key of FIGHTER_BIRTH_KEYS) {
      const v = f.birth[key]
      if (v !== undefined && !fighterFieldInBounds(key, v)) bad = true
    }
    for (const key of FIGHTER_GROWTH_BASE_KEYS) {
      const v = f.growthBase[key]
      if (v !== undefined && !fighterFieldInBounds(key, v)) bad = true
    }
    for (const key of FIGHTER_CAREER_KEYS) {
      const v = f.career[key]
      if (v !== undefined && !fighterFieldInBounds(key, v)) bad = true
    }
    for (const key of FIGHTER_PERSONALITY_KEYS) {
      const v = f.personality[key]
      if (v !== undefined && !fighterFieldInBounds(key, v)) bad = true
    }
    for (const key of FIGHTER_AI_PROFILE_KEYS) {
      const v = f.aiProfile[key]
      if (v !== undefined && !fighterFieldInBounds(key, v)) bad = true
    }
    if (bad) {
      issues.push({ code: 'INVALID_FIGHTER', args: [i, f.id || f.displayName] })
    }
  }

  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i]!
    for (const line of item.stats) {
      if (!line.statId || !itemStatInBounds(line.statId, line.amount)) {
        issues.push({ code: 'INVALID_ITEM', args: [i, item.definitionId || item.instanceId] })
        break
      }
    }
  }

  return issues
}
