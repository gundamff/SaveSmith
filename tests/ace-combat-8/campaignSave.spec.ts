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
  ACE_DIFFICULTY_BIT,
  FREE_MISSION_IDS,
  FULL_UNLOCK_FEATURE_MASK,
  HANGAR_SITUATION_IDS,
  POST_CAMPAIGN_CLEAR_MASK,
  REF_AIRCRAFT_TREE_NODE_IDS,
  REF_EMBLEM_IDS,
  REF_MEDAL_IDS,
  REF_OWNED_AIRCRAFT_IDS,
  REF_SKIN_IDS
} from '../../src/games/ace-combat-8/model/features'
import { isAceUnlockEntryActive } from '../../src/games/ace-combat-8/model/unlockFlags'
import { setContainsU32, setOwnedAircraft, readOwnedAircraftIds } from '../../src/games/ace-combat-8/model/ownedLists'
import { readMissionRecords, setMissionDifficultyRank } from '../../src/games/ace-combat-8/model/missionRecords'
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
import { assertPackedDataUe54 } from '../../src/games/ace-combat-8/model/ue54'

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
  assertPackedDataUe54(bytes)
}

function expectSuperset(actual: number[], required: readonly number[]): void {
  const set = new Set(actual)
  for (const id of required) expect(set.has(id)).toBe(true)
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
    expect(view.ownedAircraftCount).toBeGreaterThan(0)
    expect(view.featureFlagMask & POST_CAMPAIGN_CLEAR_MASK).toBe(0)
    expect(isAceUnlockEntryActive(patch.bytes)).toBe(false)
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

  it('applies post-campaign unlocks aligned to 100% snapshot lists', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const before = patch.bytes.length
    applyPostCampaignUnlocks(patch)
    const view = readCampaignView(patch)
    expect(view.completionCount).toBe(1)
    expect(view.unlockedFreeMissionIds).toEqual(FREE_MISSION_IDS)
    expect(view.featureFlagMask & FULL_UNLOCK_FEATURE_MASK).toBe(FULL_UNLOCK_FEATURE_MASK)
    expect(view.featureFlagMask & ACE_DIFFICULTY_BIT).toBe(ACE_DIFFICULTY_BIT)
    expect(isAceUnlockEntryActive(patch.bytes)).toBe(true)
    expect(patch.bytes.length).toBeGreaterThan(before)

    const hangar = findInt32ArrayProperty(patch.bytes, 'UnlockedHangarSituationIDs')
    expect(readInt32Array(patch.bytes, hangar!)).toEqual(HANGAR_SITUATION_IDS)

    const tree = findUInt32ArrayProperty(patch.bytes, 'UnlockedAircraftTreeNodeIDs')
    expectSuperset(readUInt32Array(patch.bytes, tree!), REF_AIRCRAFT_TREE_NODE_IDS)
    const skins = findUInt32ArrayProperty(patch.bytes, 'UnlockedSkinIdList')
    expectSuperset(readUInt32Array(patch.bytes, skins!), REF_SKIN_IDS)
    const emblems = findUInt32ArrayProperty(patch.bytes, 'UnlockedEmblemIdList')
    expectSuperset(readUInt32Array(patch.bytes, emblems!), REF_EMBLEM_IDS)
    const medals = findUInt32ArrayProperty(patch.bytes, 'UnlockedMedalIdList')
    expectSuperset(readUInt32Array(patch.bytes, medals!), REF_MEDAL_IDS)

    const packed = findByteArrayProperty(patch.bytes, 'PackedData')
    expect(packed!.count).toBe(packed!.blockEnd - packed!.dataOffset)
    assertChecksumValid(patch.bytes)
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
    expect(view.featureFlagMask & FULL_UNLOCK_FEATURE_MASK).toBe(FULL_UNLOCK_FEATURE_MASK)
    expect(view.unlockedFreeMissionIds).toEqual(FREE_MISSION_IDS)
    expect(isAceUnlockEntryActive(patch.bytes)).toBe(true)
    assertChecksumValid(patch.bytes)
  })

  it('toggles owned aircraft and reseals', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const before = readOwnedAircraftIds(patch.bytes)
    expect(before.length).toBeGreaterThan(0)
    const id = before[0]!
    setOwnedAircraft(patch, id, false)
    expect(readOwnedAircraftIds(patch.bytes)).not.toContain(id)
    setOwnedAircraft(patch, id, true)
    expect(readOwnedAircraftIds(patch.bytes)).toContain(id)
    assertChecksumValid(patch.bytes)
  })

  it('adds a 100% catalog plane missing from the mid save', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const before = new Set(readOwnedAircraftIds(patch.bytes))
    const extra = REF_OWNED_AIRCRAFT_IDS.find((id) => !before.has(id))
    expect(extra).toBeTruthy()
    setOwnedAircraft(patch, extra!, true)
    expect(readOwnedAircraftIds(patch.bytes)).toContain(extra)
    assertChecksumValid(patch.bytes)
  })

  it('adds a skin through the UE54 tree rewrite used by GitHub editor', () => {
    const original = load('campaign-midgame.sav')
    const patch = loadCampaignPatch(new Uint8Array(original))
    const before = findByteArrayProperty(patch.bytes, 'PackedData')!.count
    const sample = REF_SKIN_IDS.find((id) => {
      const field = findUInt32ArrayProperty(patch.bytes, 'UnlockedSkinIdList')
      return field ? !readUInt32Array(patch.bytes, field).includes(id) : false
    })
    expect(sample).toBeTruthy()
    setContainsU32(patch, 'UnlockedSkinIdList', sample!, true, 'NewlyUnlockedSkinIdList')
    expect(readUInt32Array(patch.bytes, findUInt32ArrayProperty(patch.bytes, 'UnlockedSkinIdList')!)).toContain(
      sample
    )
    expect(findByteArrayProperty(patch.bytes, 'PackedData')!.count).toBeGreaterThan(before)
    assertChecksumValid(patch.bytes)
  })

  it('reads mission records and can set an existing difficulty rank', () => {
    const patch = loadCampaignPatch(load('campaign-midgame.sav'))
    const recs = readMissionRecords(patch.bytes)
    expect(recs.length).toBeGreaterThan(0)
    const withDiff = recs.find((r) => r.difficulties.length > 0)
    expect(withDiff).toBeTruthy()
    const level = withDiff!.difficulties[0]!.level
    setMissionDifficultyRank(patch, withDiff!.missionId, level, 'S')
    const again = readMissionRecords(patch.bytes).find((r) => r.missionId === withDiff!.missionId)
    expect(again?.difficulties.find((d) => d.level === level)?.rank).toBe('S')
    assertChecksumValid(patch.bytes)
  })
})
