import { ModuleError } from '@sdk/error'
import { resealAfter, type CampaignSavePatch } from './campaignSave'
import { clearRankBare, readInt32, readUInt32 } from './gvas'

export const DIFFICULTY_NAMES = ['', 'Rookie', 'Normal', 'Hard', 'Expert', 'Ace'] as const
export const RANK_NAMES = ['C', 'B', 'A', 'S'] as const

export interface MissionDifficultyView {
  level: number
  rank: string
}

export interface MissionRecordView {
  missionId: number
  lastRank: string
  difficulties: MissionDifficultyView[]
  rankValueOffsets: Partial<Record<number, number>>
}

const enc = new TextEncoder()
const NAME_COMPLETED = enc.encode('CompletedMissionList\0')
const NAME_MISSION_ID = enc.encode('MissionID\0')
const NAME_DIFFICULTY_LEVEL = enc.encode('DifficultyLevel\0')
const NAME_LAST_RANK = enc.encode('LastRank\0')
const NAME_HIGHEST_RANK = enc.encode('HighestRank\0')

function indexOfPrefixedName(bytes: Uint8Array, from: number, to: number, nameNul: Uint8Array): number {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const last = Math.min(to, bytes.length) - nameNul.length
  const first = nameNul[0]!
  for (let i = Math.max(4, from); i <= last; i++) {
    if (bytes[i] !== first) continue
    let ok = true
    for (let j = 1; j < nameNul.length; j++) {
      if (bytes[i + j] !== nameNul[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    if (dv.getInt32(i - 4, true) !== nameNul.length) continue
    return i - 4
  }
  return -1
}

function readFString(bytes: Uint8Array, offset: number): { text: string; next: number } | null {
  if (offset + 4 > bytes.length) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const len = dv.getInt32(offset, true)
  if (len <= 0 || offset + 4 + len > bytes.length) return null
  let s = ''
  let seenNul = false
  for (let i = 0; i < len; i++) {
    const b = bytes[offset + 4 + i]!
    if (b === 0) {
      seenNul = true
      break
    }
    s += String.fromCharCode(b)
  }
  if (!seenNul) return null
  return { text: s, next: offset + 4 + len }
}

function findCompletedMissionListSpan(
  bytes: Uint8Array
): { count: number; bodyOff: number; bodyEnd: number } | null {
  const hit = indexOfPrefixedName(bytes, 4, bytes.length, NAME_COMPLETED)
  if (hit < 0) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let c = hit + 4 + NAME_COMPLETED.length
  const arr = readFString(bytes, c)
  if (!arr || arr.text !== 'ArrayProperty') return null
  c = arr.next + 4
  const inner = readFString(bytes, c)
  if (!inner || inner.text !== 'StructProperty') return null
  c = inner.next + 4
  const structName = readFString(bytes, c)
  if (!structName || structName.text !== 'LiveMissionSaveData') return null
  c = structName.next + 4
  const path = readFString(bytes, c)
  if (!path) return null
  c = path.next
  const pad = dv.getInt32(c, true)
  c += 4
  const dataSize = dv.getInt32(c, true)
  c += 4
  const guid = bytes[c]!
  c += 1
  const count = dv.getInt32(c, true)
  c += 4
  if (pad !== 0 || guid !== 0 || count < 0 || count > 64) return null
  if (dataSize < 4 || c + dataSize - 4 > bytes.length) return null
  const bodyEnd = c + dataSize - 4
  return { count, bodyOff: c, bodyEnd }
}

function readIntAtProperty(bytes: Uint8Array, nameOff: number): number | null {
  const name = readFString(bytes, nameOff)
  if (!name) return null
  const typ = readFString(bytes, name.next)
  if (!typ || (typ.text !== 'IntProperty' && typ.text !== 'UInt32Property')) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let c = typ.next + 4
  const size = dv.getInt32(c, true)
  c += 5
  if (size !== 4) return null
  return typ.text === 'IntProperty' ? readInt32(bytes, c) : readUInt32(bytes, c)
}

function readByteAtProperty(bytes: Uint8Array, nameOff: number): number | null {
  const name = readFString(bytes, nameOff)
  if (!name) return null
  const typ = readFString(bytes, name.next)
  if (!typ || typ.text !== 'ByteProperty') return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let c = typ.next + 4
  const size = dv.getInt32(c, true)
  c += 5
  if (size !== 1) return null
  return bytes[c]!
}

function readEnumAtProperty(
  bytes: Uint8Array,
  nameOff: number
): { value: string; valueOffset: number } | null {
  const name = readFString(bytes, nameOff)
  if (!name) return null
  const typ = readFString(bytes, name.next)
  if (!typ || typ.text !== 'EnumProperty') return null
  let c = typ.next + 4
  const enumType = readFString(bytes, c)
  if (!enumType) return null
  c = enumType.next + 4
  const path = readFString(bytes, c)
  if (!path) return null
  c = path.next + 4
  const inner = readFString(bytes, c)
  if (!inner || inner.text !== 'ByteProperty') return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  c = inner.next + 4
  dv.getInt32(c, true)
  c += 5
  const valuePart = readFString(bytes, c)
  if (!valuePart) return null
  return { value: valuePart.text, valueOffset: c }
}

export function readMissionRecords(bytes: Uint8Array): MissionRecordView[] {
  const list = findCompletedMissionListSpan(bytes)
  if (!list) return []
  const starts: number[] = []
  let cursor = list.bodyOff
  while (starts.length < list.count) {
    const hit = indexOfPrefixedName(bytes, cursor, list.bodyEnd, NAME_MISSION_ID)
    if (hit < 0) break
    starts.push(hit)
    cursor = hit + 8
  }
  const out: MissionRecordView[] = []
  for (let r = 0; r < starts.length; r++) {
    const from = starts[r]!
    const to = r + 1 < starts.length ? starts[r + 1]! : list.bodyEnd
    const missionId = readIntAtProperty(bytes, from) ?? 0
    const lastHit = indexOfPrefixedName(bytes, from, to, NAME_LAST_RANK)
    const last = lastHit >= 0 ? readEnumAtProperty(bytes, lastHit) : null
    const diffs: MissionDifficultyView[] = []
    const rankValueOffsets: Partial<Record<number, number>> = {}
    let p = from
    while (p < to) {
      const lvlHit = indexOfPrefixedName(bytes, p, to, NAME_DIFFICULTY_LEVEL)
      if (lvlHit < 0) break
      const level = readByteAtProperty(bytes, lvlHit)
      const rankHit = indexOfPrefixedName(bytes, lvlHit, Math.min(lvlHit + 240, to), NAME_HIGHEST_RANK)
      const rank = rankHit >= 0 ? readEnumAtProperty(bytes, rankHit) : null
      if (level != null && rank) {
        diffs.push({ level, rank: clearRankBare(rank.value) })
        rankValueOffsets[level] = rank.valueOffset
      }
      p = lvlHit + 8
    }
    out.push({
      missionId,
      lastRank: last ? clearRankBare(last.value) : '',
      difficulties: diffs,
      rankValueOffsets
    })
  }
  return out
}

export function setMissionDifficultyRank(
  patch: CampaignSavePatch,
  missionId: number,
  level: number,
  rank: string
): void {
  const recs = readMissionRecords(patch.bytes)
  const rec = recs.find((r) => r.missionId === missionId)
  if (!rec) throw new ModuleError('MISSING_FIELD', [`CompletedMissionList:${missionId}`])
  const off = rec.rankValueOffsets[level]
  if (off == null) throw new ModuleError('INVALID_STATE', [`no difficulty ${level} for mission ${missionId}`])
  pokeClearRankLetter(patch.bytes, off, rank)
  resealAfter(patch, patch.bytes)
}

export function setAllExistingMissionRanks(patch: CampaignSavePatch, rank: string): void {
  const recs = readMissionRecords(patch.bytes)
  for (const rec of recs) {
    for (const d of rec.difficulties) {
      const off = rec.rankValueOffsets[d.level]
      if (off == null) continue
      pokeClearRankLetter(patch.bytes, off, rank)
    }
  }
  resealAfter(patch, patch.bytes)
}

/** AC8 stores ELiveClearRank::* with FString length 18 (one extra byte). Never rewrite the FString header. */
function pokeClearRankLetter(bytes: Uint8Array, fstringOffset: number, rank: string): void {
  const letter = clearRankBare(rank)
  if (!/^[A-Z]$/.test(letter)) throw new ModuleError('OUT_OF_RANGE', ['HighestRank'])
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const len = dv.getInt32(fstringOffset, true)
  const prefix = enc.encode('ELiveClearRank::')
  if (len < prefix.length + 2) throw new ModuleError('INVALID_FORMAT', ['HighestRank'])
  const start = fstringOffset + 4
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[start + i] !== prefix[i]) throw new ModuleError('INVALID_FORMAT', ['HighestRank'])
  }
  bytes[start + prefix.length] = letter.charCodeAt(0)
}
