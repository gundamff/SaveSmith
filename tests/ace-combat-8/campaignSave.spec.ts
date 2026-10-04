import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  applyPostCampaignUnlocks,
  applyPseudoNewGamePlus,
  loadCampaignPatch,
  readCampaignView,
  setCurrentMrp,
  setTotalMrp
} from '../../src/games/ace-combat-8/model/campaignSave'
import {
  CLEARED_AIRCRAFT_TREE_NODE_IDS,
  CLEARED_CAMPAIGN_FEATURE_MASK,
  FREE_MISSION_IDS,
  HANGAR_SITUATION_IDS,
  POST_CAMPAIGN_CLEAR_MASK
} from '../../src/games/ace-combat-8/model/features'
import {
  computePackedChecksum,
  findByteArrayProperty,
  findInt32ArrayProperty,
  findScalarProperty,
  findUInt32ArrayProperty,
  readInt32Array,
  readUInt32,
  readUInt32Array
} from '../../src/games/ace-combat-8/model/gvas'

function readStoredChecksum(bytes: Uint8Array): number {
  const field = findScalarProperty(bytes, 'Checksum', 'UInt32Property')
  if (!field) throw new Error('missing Checksum')
  return readUInt32(bytes, field.valueOffset)
}

function assertChecksumValid(bytes: Uint8Array): void {
  const packed = findByteArrayProperty(bytes, 'PackedData')
  if (!packed) throw new Error('missing PackedData')
  expect(readStoredChecksum(bytes)).toBe(
    computePackedChecksum(bytes.subarray(packed.dataOffset, packed.blockEnd))
  )
}

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixtures, name)))
}

describe('ace-combat-8 campaign save', () => {
  it('reads mid-game MRP and progress', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const view = readCampaignView(patch)
    expect(view.currentMrp).toBe(11418420n)
    expect(view.totalMrp).toBe(13726420n)
    expect(view.lastCompletedMissionId).toBe(5)
    expect(view.completionCount).toBe(0)
    expect(view.unlockedFreeMissionIds).toEqual([1, 2, 3, 4, 5])
    expect(view.featureFlagMask & POST_CAMPAIGN_CLEAR_MASK).toBe(0)
  })

  it('reads cleared-save post-campaign flags', () => {
    const patch = loadCampaignPatch(load('campaign-cleared.sav'))
    const view = readCampaignView(patch)
    expect(view.completionCount).toBe(1)
    expect(view.lastCompletedMissionId).toBe(31)
    expect(view.unlockedFreeMissionIds.length).toBe(31)
    expect(view.featureFlagMask & POST_CAMPAIGN_CLEAR_MASK).toBe(POST_CAMPAIGN_CLEAR_MASK)
    expect(view.currentMrp).toBe(88617717n)
  })

  it('accepts fixture checksums under AC8 CRC32 seed', () => {
    assertChecksumValid(load('campaign-midgame.sav'))
    assertChecksumValid(load('campaign-cleared.sav'))
  })

  it('patches MRP in place and reseals checksum', () => {
    const original = load('campaign-midgame.sav')
    const before = readStoredChecksum(original)
    const patch = loadCampaignPatch(new Uint8Array(original))
    setCurrentMrp(patch, 50_000_000n)
    setTotalMrp(patch, 50_000_000n)
    expect(patch.bytes.length).toBe(original.length)
    const view = readCampaignView(patch)
    expect(view.currentMrp).toBe(50_000_000n)
    expect(view.totalMrp).toBe(50_000_000n)
    expect(readStoredChecksum(patch.bytes)).not.toBe(before)
    assertChecksumValid(patch.bytes)
  })

  it('applies post-campaign unlocks: flags, hangar, free missions, tree nodes', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const before = patch.bytes.length
    applyPostCampaignUnlocks(patch)
    const view = readCampaignView(patch)
    expect(view.completionCount).toBe(1)
    expect(view.unlockedFreeMissionIds).toEqual(FREE_MISSION_IDS)
    expect(view.featureFlagMask & CLEARED_CAMPAIGN_FEATURE_MASK).toBe(CLEARED_CAMPAIGN_FEATURE_MASK)
    expect(view.featureFlagMask & POST_CAMPAIGN_CLEAR_MASK).toBe(POST_CAMPAIGN_CLEAR_MASK)
    expect(patch.bytes.length).toBeGreaterThan(before)

    const hangar = findInt32ArrayProperty(patch.bytes, 'UnlockedHangarSituationIDs')
    expect(hangar).toBeTruthy()
    expect(readInt32Array(patch.bytes, hangar!)).toEqual(HANGAR_SITUATION_IDS)
    const newlyHangar = findInt32ArrayProperty(patch.bytes, 'NewlyUnlockedHangarSituationIDs')
    expect(readInt32Array(patch.bytes, newlyHangar!)).toEqual(HANGAR_SITUATION_IDS)
    const newlyFree = findInt32ArrayProperty(patch.bytes, 'NewlyUnlockedFreeMissionIDs')
    expect(readInt32Array(patch.bytes, newlyFree!)).toEqual(FREE_MISSION_IDS)

    const tree = findUInt32ArrayProperty(patch.bytes, 'UnlockedAircraftTreeNodeIDs')
    expect(tree).toBeTruthy()
    const treeIds = new Set(readUInt32Array(patch.bytes, tree!))
    for (const id of CLEARED_AIRCRAFT_TREE_NODE_IDS) expect(treeIds.has(id)).toBe(true)

    const packed = findByteArrayProperty(patch.bytes, 'PackedData')
    expect(packed).toBeTruthy()
    expect(packed!.count).toBe(packed!.blockEnd - packed!.dataOffset)
    assertChecksumValid(patch.bytes)
    // Keep story cursor — do not shove the player onto mission 30/31.
    expect(view.lastCompletedMissionId).toBe(5)
    expect(view.lastPlayedMissionId).toBe(5)
  })

  it('pseudo NG+ resets mission cursor while keeping unlocks', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const mrp = readCampaignView(patch).currentMrp
    applyPseudoNewGamePlus(patch)
    const view = readCampaignView(patch)
    expect(view.currentMrp).toBe(mrp)
    expect(view.lastCompletedMissionId).toBe(0)
    expect(view.lastPlayedMissionId).toBe(0)
    expect(view.completionCount).toBe(1)
    expect(view.featureFlagMask & CLEARED_CAMPAIGN_FEATURE_MASK).toBe(CLEARED_CAMPAIGN_FEATURE_MASK)
    expect(view.unlockedFreeMissionIds).toEqual(FREE_MISSION_IDS)
    const hangar = findInt32ArrayProperty(patch.bytes, 'UnlockedHangarSituationIDs')
    expect(readInt32Array(patch.bytes, hangar!)).toEqual(HANGAR_SITUATION_IDS)
    assertChecksumValid(patch.bytes)
  })
})
