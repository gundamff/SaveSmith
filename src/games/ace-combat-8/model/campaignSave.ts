import { ModuleError } from '@sdk/error'
import {
  CLEARED_AIRCRAFT_TREE_NODE_IDS,
  CLEARED_CAMPAIGN_FEATURE_MASK,
  FREE_MISSION_IDS,
  HANGAR_SITUATION_IDS,
  mergePostCampaignFlags,
  mergeUniqueIds,
  POST_CAMPAIGN_CLEAR_MASK
} from './features'
import {
  assertGvasMagic,
  computePackedChecksum,
  findByteArrayProperty,
  findInt32ArrayProperty,
  findScalarProperty,
  findUInt32ArrayProperty,
  readInt32,
  readInt32Array,
  readUInt32,
  readUInt32Array,
  readUInt64,
  writeInt32,
  writeInt32Array,
  writeUInt32,
  writeUInt32Array,
  writeUInt64,
  type GvasInt32ArrayField
} from './gvas'

export interface CampaignSaveView {
  currentMrp: bigint
  totalMrp: bigint
  featureFlagMask: number
  completionCount: number
  lastCompletedMissionId: number
  lastPlayedMissionId: number
  unlockedFreeMissionIds: number[]
  unlockedHangarSituationIds: number[]
  unlockedAircraftTreeNodeCount: number
}

interface GvasScalarRef {
  valueOffset: number
  type: 'u64' | 'u32' | 'i32'
}

export interface CampaignSavePatch {
  bytes: Uint8Array
  scalars: {
    currentMrp: GvasScalarRef
    totalMrp: GvasScalarRef
    featureFlagMask: GvasScalarRef
    completionCount: GvasScalarRef
    lastCompletedMissionId: GvasScalarRef
    lastPlayedMissionId: GvasScalarRef
  }
  unlockedFreeMissionIds: GvasInt32ArrayField
}

function requireScalar(
  bytes: Uint8Array,
  name: string,
  type: 'UInt64Property' | 'UInt32Property' | 'IntProperty'
): GvasScalarRef {
  const field = findScalarProperty(bytes, name, type)
  if (!field) throw new ModuleError('MISSING_FIELD', [name])
  const kind =
    type === 'UInt64Property' ? 'u64' : type === 'UInt32Property' ? 'u32' : 'i32'
  return { valueOffset: field.valueOffset, type: kind }
}

function resolvePatch(bytes: Uint8Array): CampaignSavePatch {
  assertGvasMagic(bytes)
  const freeMissions = findInt32ArrayProperty(bytes, 'UnlockedFreeMissionIDs')
  if (!freeMissions) throw new ModuleError('MISSING_FIELD', ['UnlockedFreeMissionIDs'])
  return {
    bytes,
    scalars: {
      currentMrp: requireScalar(bytes, 'CurrentMRP', 'UInt64Property'),
      totalMrp: requireScalar(bytes, 'TotalMRP', 'UInt64Property'),
      featureFlagMask: requireScalar(bytes, 'FeatureFlagMask', 'UInt32Property'),
      completionCount: requireScalar(bytes, 'CompletionCount', 'UInt32Property'),
      lastCompletedMissionId: requireScalar(bytes, 'LastCompletedMissionID', 'IntProperty'),
      lastPlayedMissionId: requireScalar(bytes, 'LastPlayedMissionID', 'IntProperty')
    },
    unlockedFreeMissionIds: freeMissions
  }
}

export function loadCampaignPatch(bytes: Uint8Array): CampaignSavePatch {
  return resolvePatch(bytes)
}

function rebind(patch: CampaignSavePatch, bytes: Uint8Array): void {
  const next = resolvePatch(bytes)
  patch.bytes = next.bytes
  patch.scalars = next.scalars
  patch.unlockedFreeMissionIds = next.unlockedFreeMissionIds
}

/** Recompute Checksum = CRC32(PackedData, seed 0x41916EBD). Call after any edit. */
export function resealChecksum(patch: CampaignSavePatch): void {
  const packed = findByteArrayProperty(patch.bytes, 'PackedData')
  if (!packed) throw new ModuleError('MISSING_FIELD', ['PackedData'])
  const checksum = findScalarProperty(patch.bytes, 'Checksum', 'UInt32Property')
  if (!checksum) throw new ModuleError('MISSING_FIELD', ['Checksum'])
  const value = computePackedChecksum(patch.bytes.subarray(packed.dataOffset, packed.blockEnd))
  writeUInt32(patch.bytes, checksum.valueOffset, value)
}

function bumpPackedDataSize(bytes: Uint8Array, delta: number): void {
  if (delta === 0) return
  const packed = findByteArrayProperty(bytes, 'PackedData')
  if (!packed) throw new ModuleError('MISSING_FIELD', ['PackedData'])
  writeInt32(bytes, packed.dataSizeOffset, packed.count + 4 + delta)
  writeInt32(bytes, packed.countOffset, packed.count + delta)
}

function replaceInt32ArrayByName(patch: CampaignSavePatch, name: string, ids: number[]): void {
  const field = findInt32ArrayProperty(patch.bytes, name)
  if (!field) throw new ModuleError('MISSING_FIELD', [name])
  const current = readInt32Array(patch.bytes, field)
  if (current.length === ids.length && current.every((v, i) => v === ids[i])) return
  const delta = (ids.length - field.count) * 4
  const nextBytes = writeInt32Array(patch.bytes, field, ids)
  bumpPackedDataSize(nextBytes, delta)
  rebind(patch, nextBytes)
}

function mergeUInt32ArrayByName(patch: CampaignSavePatch, name: string, extra: readonly number[]): void {
  const field = findUInt32ArrayProperty(patch.bytes, name)
  if (!field) throw new ModuleError('MISSING_FIELD', [name])
  const merged = mergeUniqueIds(readUInt32Array(patch.bytes, field), extra)
  if (merged.length === field.count) {
    // Length unchanged but order/content may still need write if subset equal size — only skip when identical
    const cur = readUInt32Array(patch.bytes, field)
    if (cur.length === merged.length && cur.every((v, i) => v === merged[i])) return
  }
  const delta = (merged.length - field.count) * 4
  const nextBytes = writeUInt32Array(patch.bytes, field, merged)
  bumpPackedDataSize(nextBytes, delta)
  rebind(patch, nextBytes)
}

export function readCampaignView(patch: CampaignSavePatch): CampaignSaveView {
  const b = patch.bytes
  const s = patch.scalars
  const hangar = findInt32ArrayProperty(b, 'UnlockedHangarSituationIDs')
  const tree = findUInt32ArrayProperty(b, 'UnlockedAircraftTreeNodeIDs')
  return {
    currentMrp: readUInt64(b, s.currentMrp.valueOffset),
    totalMrp: readUInt64(b, s.totalMrp.valueOffset),
    featureFlagMask: readUInt32(b, s.featureFlagMask.valueOffset),
    completionCount: readUInt32(b, s.completionCount.valueOffset),
    lastCompletedMissionId: readInt32(b, s.lastCompletedMissionId.valueOffset),
    lastPlayedMissionId: readInt32(b, s.lastPlayedMissionId.valueOffset),
    unlockedFreeMissionIds: readInt32Array(b, patch.unlockedFreeMissionIds),
    unlockedHangarSituationIds: hangar ? readInt32Array(b, hangar) : [],
    unlockedAircraftTreeNodeCount: tree ? tree.count : 0
  }
}

export function setCurrentMrp(patch: CampaignSavePatch, value: bigint): void {
  if (value < 0n || value > 999_999_999n) throw new ModuleError('OUT_OF_RANGE', ['CurrentMRP'])
  writeUInt64(patch.bytes, patch.scalars.currentMrp.valueOffset, value)
  resealChecksum(patch)
}

export function setTotalMrp(patch: CampaignSavePatch, value: bigint): void {
  if (value < 0n || value > 999_999_999n) throw new ModuleError('OUT_OF_RANGE', ['TotalMRP'])
  writeUInt64(patch.bytes, patch.scalars.totalMrp.valueOffset, value)
  resealChecksum(patch)
}

export function setFeatureFlagMask(patch: CampaignSavePatch, mask: number): void {
  writeUInt32(patch.bytes, patch.scalars.featureFlagMask.valueOffset, mask >>> 0)
  resealChecksum(patch)
}

export function setCompletionCount(patch: CampaignSavePatch, count: number): void {
  if (count < 0 || count > 99) throw new ModuleError('OUT_OF_RANGE', ['CompletionCount'])
  writeUInt32(patch.bytes, patch.scalars.completionCount.valueOffset, count >>> 0)
  resealChecksum(patch)
}

export function setLastCompletedMissionId(patch: CampaignSavePatch, id: number): void {
  if (id < 0 || id > 31) throw new ModuleError('OUT_OF_RANGE', ['LastCompletedMissionID'])
  writeInt32(patch.bytes, patch.scalars.lastCompletedMissionId.valueOffset, id)
  resealChecksum(patch)
}

export function setLastPlayedMissionId(patch: CampaignSavePatch, id: number): void {
  if (id < 0 || id > 31) throw new ModuleError('OUT_OF_RANGE', ['LastPlayedMissionID'])
  writeInt32(patch.bytes, patch.scalars.lastPlayedMissionId.valueOffset, id)
  resealChecksum(patch)
}

export function setUnlockedFreeMissionIds(patch: CampaignSavePatch, ids: number[]): void {
  for (const id of ids) {
    if (id < 1 || id > 31) throw new ModuleError('OUT_OF_RANGE', ['UnlockedFreeMissionIDs'])
  }
  replaceInt32ArrayByName(patch, 'UnlockedFreeMissionIDs', ids)
  resealChecksum(patch)
}

/**
 * Unlock post-campaign features without resetting story cursor.
 * Also syncs hangar situations + merges cleared-save aircraft-tree nodes (FeatureFlag alone is not enough).
 */
export function applyPostCampaignUnlocks(patch: CampaignSavePatch): void {
  const view = readCampaignView(patch)
  if (view.completionCount < 1) {
    writeUInt32(patch.bytes, patch.scalars.completionCount.valueOffset, 1)
  }
  writeUInt32(
    patch.bytes,
    patch.scalars.featureFlagMask.valueOffset,
    mergePostCampaignFlags(readUInt32(patch.bytes, patch.scalars.featureFlagMask.valueOffset))
  )

  replaceInt32ArrayByName(patch, 'UnlockedFreeMissionIDs', FREE_MISSION_IDS)
  replaceInt32ArrayByName(patch, 'NewlyUnlockedFreeMissionIDs', FREE_MISSION_IDS)
  replaceInt32ArrayByName(patch, 'UnlockedHangarSituationIDs', HANGAR_SITUATION_IDS)
  replaceInt32ArrayByName(patch, 'NewlyUnlockedHangarSituationIDs', HANGAR_SITUATION_IDS)
  mergeUInt32ArrayByName(patch, 'UnlockedAircraftTreeNodeIDs', CLEARED_AIRCRAFT_TREE_NODE_IDS)
  mergeUInt32ArrayByName(patch, 'NewlyUnlockedAircraftTreeNodeIDs', CLEARED_AIRCRAFT_TREE_NODE_IDS)

  resealChecksum(patch)
}

/**
 * Pseudo NG+: reset campaign cursor to prologue while keeping hangar/MRP and post-clear privileges.
 */
export function applyPseudoNewGamePlus(patch: CampaignSavePatch): void {
  applyPostCampaignUnlocks(patch)
  setLastCompletedMissionId(patch, 0)
  setLastPlayedMissionId(patch, 0)
}

export function validateCampaignView(view: CampaignSaveView): void {
  if (view.totalMrp < view.currentMrp) {
    throw new ModuleError('INVALID_STATE', ['TotalMRP < CurrentMRP'])
  }
}

export const REFERENCE_CLEARED_FEATURE_MASK = CLEARED_CAMPAIGN_FEATURE_MASK
export const REFERENCE_POST_CLEAR_DELTA = POST_CAMPAIGN_CLEAR_MASK
