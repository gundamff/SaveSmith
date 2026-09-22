import {
  FIGHTER_ABILITY_HOTKEY_SLOTS_KEY,
  FIGHTER_ACTIVE_ABILITIES_KEY,
  FIGHTER_AI_PROFILE_KEY,
  FIGHTER_AI_PROFILE_KEYS,
  FIGHTER_BIRTH_KEYS,
  FIGHTER_CAREER_KEYS,
  FIGHTER_DISPLAY_NAME_KEY,
  FIGHTER_EQUIPPED_ITEM_IDS_KEY,
  FIGHTER_EXPERIENCE_KEY,
  FIGHTER_GROWTH_BASE_KEYS,
  FIGHTER_GROWTH_STYLES_KEY,
  FIGHTER_ID_KEY,
  FIGHTER_INJURED_KEY,
  FIGHTER_INJURY_BATTLES_KEY,
  FIGHTER_INJURY_DESCRIPTION_KEY,
  FIGHTER_LEVEL_KEY,
  FIGHTER_PERSONALITY_KEYS,
  FIGHTER_ROSTER_PATH
} from './fields'
import { clampFighterField } from './bounds'
import type { FighterRow } from './types'
import type { IntResourceWire, PropWire, ResValue, ResourceDoc } from '../resource/binary'
import {
  OBJECT_INTERNAL_RESOURCE,
  VARIANT_OBJECT,
  isRawValue,
  resValueToVariant,
  variantToResValue,
  type VariantNode
} from '../resource/variant'

export type { FighterRow } from './types'

/** Opaque apply handle — resourceIndex into doc.wire.resources. */
export type FighterRef = { resourceIndex: number }

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function decodeInternalIndex(raw: { __raw: Uint8Array }): number | null {
  if (raw.__raw.length < 12) return null
  const view = new DataView(raw.__raw.buffer, raw.__raw.byteOffset, raw.__raw.byteLength)
  const type = view.getUint32(0, true)
  const objType = view.getUint32(4, true)
  const index = view.getUint32(8, true)
  if (type !== VARIANT_OBJECT || objType !== OBJECT_INTERNAL_RESOURCE) return null
  return index
}

function resolveObjectIndex(node: VariantNode | undefined): number | null {
  if (!node) return null
  if (node.kind === 'object' && node.objType === OBJECT_INTERNAL_RESOURCE && node.index !== undefined) {
    return node.index
  }
  if (node.kind === 'raw') {
    return decodeInternalIndex({ __raw: node.bytes })
  }
  return null
}

function getProp(res: IntResourceWire, name: string): PropWire | undefined {
  return res.properties.find((p) => p.name === name)
}

function readPropValue(res: IntResourceWire, name: string): ResValue | undefined {
  const p = getProp(res, name)
  return p ? variantToResValue(p.value) : undefined
}

function writePropValue(res: IntResourceWire, name: string, value: ResValue): void {
  const existing = getProp(res, name)
  if (existing) {
    existing.value = resValueToVariant(value, existing.value)
    return
  }
  res.properties.push({
    name,
    nameIndex: null,
    inline: true,
    value: resValueToVariant(value)
  })
}

function readNumberMap(res: IntResourceWire, keys: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of keys) {
    const v = readPropValue(res, key)
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v
  }
  return out
}

function readStringArray(raw: ResValue | undefined): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => (typeof x === 'string' ? x : ''))
}

function writeNumberMap(res: IntResourceWire, map: Record<string, number>, keys: readonly string[]): void {
  const allowed = new Set(keys)
  for (const [key, value] of Object.entries(map)) {
    if (!allowed.has(key)) continue
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    writePropValue(res, key, clampFighterField(key, value))
  }
}

function skillKey(index: number): string {
  return `skill_${String(index + 1).padStart(2, '0')}`
}

function readSkills(res: IntResourceWire): Record<string, string> {
  const raw = readPropValue(res, FIGHTER_ACTIVE_ABILITIES_KEY)
  const out: Record<string, string> = {}
  if (!Array.isArray(raw)) return out
  raw.forEach((item, i) => {
    if (typeof item === 'string') out[skillKey(i)] = item
  })
  return out
}

function skillsToArray(skills: Record<string, string>): string[] {
  const entries = Object.entries(skills)
    .map(([k, v]) => {
      const m = /^skill_(\d+)$/.exec(k)
      if (!m || typeof v !== 'string') return null
      return { index: Number(m[1]) - 1, value: v }
    })
    .filter((x): x is { index: number; value: string } => x !== null && x.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (entries.length === 0) return []
  const max = Math.max(...entries.map((e) => e.index))
  const arr: string[] = Array.from({ length: max + 1 }, () => '')
  for (const e of entries) arr[e.index] = e.value
  return arr
}

function resolveAiResource(doc: ResourceDoc, fighter: IntResourceWire): IntResourceWire | null {
  const p = getProp(fighter, FIGHTER_AI_PROFILE_KEY)
  const idx = resolveObjectIndex(p?.value)
  if (idx === null) return null
  return doc.wire.resources[idx] ?? null
}

function projectFighter(doc: ResourceDoc, resourceIndex: number): FighterRow | null {
  const res = doc.wire.resources[resourceIndex]
  if (!res) return null

  const ai = resolveAiResource(doc, res)

  return {
    id: asString(readPropValue(res, FIGHTER_ID_KEY)),
    displayName: asString(readPropValue(res, FIGHTER_DISPLAY_NAME_KEY)),
    configId: asString(readPropValue(res, 'config_id')),
    level: asNumber(readPropValue(res, FIGHTER_LEVEL_KEY)),
    experience: asNumber(readPropValue(res, FIGHTER_EXPERIENCE_KEY)),
    growthStyles: readPropValue(res, FIGHTER_GROWTH_STYLES_KEY) ?? [],
    birth: readNumberMap(res, FIGHTER_BIRTH_KEYS),
    growthBase: readNumberMap(res, FIGHTER_GROWTH_BASE_KEYS),
    career: readNumberMap(res, FIGHTER_CAREER_KEYS),
    personality: ai ? readNumberMap(ai, FIGHTER_PERSONALITY_KEYS) : {},
    aiProfile: ai ? readNumberMap(ai, FIGHTER_AI_PROFILE_KEYS) : {},
    skills: readSkills(res),
    injured: asBool(readPropValue(res, FIGHTER_INJURED_KEY)),
    injuryBattlesRemaining: asNumber(readPropValue(res, FIGHTER_INJURY_BATTLES_KEY)),
    injuryDescription: asString(readPropValue(res, FIGHTER_INJURY_DESCRIPTION_KEY)),
    equippedItemInstanceIds: readStringArray(readPropValue(res, FIGHTER_EQUIPPED_ITEM_IDS_KEY)),
    _ref: { resourceIndex } satisfies FighterRef
  }
}

function refIndex(row: FighterRow): number | null {
  const ref = row._ref as FighterRef | null | undefined
  if (ref && typeof ref.resourceIndex === 'number') return ref.resourceIndex
  return null
}

/** List player-owned mercenaries only (owned_mercenaries). */
export function listFighters(doc: ResourceDoc): FighterRow[] {
  const roster = doc.root[FIGHTER_ROSTER_PATH]
  if (!Array.isArray(roster)) return []

  const rows: FighterRow[] = []
  for (const item of roster) {
    let index: number | null = null
    if (isRawValue(item)) index = decodeInternalIndex(item)
    if (index === null) continue
    const row = projectFighter(doc, index)
    if (row) rows.push(row)
  }
  return rows
}

/**
 * Write editable FighterRow fields back onto the original wire Resource.
 * Unknown / unlisted properties on the fighter and ai_profile_override are left intact.
 */
export function applyFighter(doc: ResourceDoc, row: FighterRow): void {
  const index = refIndex(row)
  if (index === null) throw new Error('fighters: missing _ref.resourceIndex')
  const res = doc.wire.resources[index]
  if (!res) throw new Error(`fighters: resource ${index} missing`)

  writePropValue(res, FIGHTER_DISPLAY_NAME_KEY, row.displayName)
  writePropValue(res, FIGHTER_LEVEL_KEY, row.level)
  writePropValue(res, FIGHTER_EXPERIENCE_KEY, row.experience)
  writePropValue(res, FIGHTER_GROWTH_STYLES_KEY, row.growthStyles)
  writeNumberMap(res, row.birth, FIGHTER_BIRTH_KEYS)
  writeNumberMap(res, row.growthBase, FIGHTER_GROWTH_BASE_KEYS)
  writeNumberMap(res, row.career, FIGHTER_CAREER_KEYS)

  const skillArr = skillsToArray(row.skills)
  writePropValue(res, FIGHTER_ACTIVE_ABILITIES_KEY, skillArr)
  if (getProp(res, FIGHTER_ABILITY_HOTKEY_SLOTS_KEY)) {
    writePropValue(res, FIGHTER_ABILITY_HOTKEY_SLOTS_KEY, skillArr)
  }

  writePropValue(res, FIGHTER_INJURED_KEY, row.injured)
  writePropValue(res, FIGHTER_INJURY_BATTLES_KEY, row.injuryBattlesRemaining)
  writePropValue(res, FIGHTER_INJURY_DESCRIPTION_KEY, row.injuryDescription)
  writePropValue(res, FIGHTER_EQUIPPED_ITEM_IDS_KEY, row.equippedItemInstanceIds)

  const ai = resolveAiResource(doc, res)
  if (ai) {
    writeNumberMap(ai, row.personality, FIGHTER_PERSONALITY_KEYS)
    writeNumberMap(ai, row.aiProfile, FIGHTER_AI_PROFILE_KEYS)
  }
}

export function clearInjury(row: FighterRow): void {
  row.injured = false
  row.injuryBattlesRemaining = 0
  row.injuryDescription = ''
}

export function maxProgress(row: FighterRow, caps: { maxLevel: number; maxExp: number }): void {
  row.level = caps.maxLevel
  row.experience = caps.maxExp
}
