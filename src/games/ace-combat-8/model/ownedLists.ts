import { aircraftInfo, WEAPON_ORDER } from './catalog'
import { rebindPatch, type CampaignSavePatch } from './campaignSave'
import {
  loadCampaignSave,
  readOwnedWeaponsOnSave,
  saveCampaignSave,
  setContainsManyU32OnSave,
  setContainsU32OnSave,
  setOwnedAircraftOnSave,
  setOwnedWeaponOnSave,
  type OwnedAircraftOptions
} from './ue54'
import { findUInt32ByteMapProperty, readUInt32ByteMap } from './gvas'

const DEFAULT_OWNED_FLAGS = 4

export function readOwnedAircraftIds(bytes: Uint8Array): number[] {
  const field = findUInt32ByteMapProperty(bytes, 'OwnedAircrafts')
  if (!field) return []
  return [...readUInt32ByteMap(bytes, field).keys()]
}

export function readOwnedWeapons(bytes: Uint8Array, planeId: number): string[] {
  return readOwnedWeaponsOnSave(loadCampaignSave(bytes), planeId)
}

export function setContainsU32(
  patch: CampaignSavePatch,
  name: string,
  id: number,
  present: boolean,
  newlyName?: string
): void {
  const sf = loadCampaignSave(patch.bytes)
  setContainsU32OnSave(sf, name, id, present)
  if (newlyName) setContainsU32OnSave(sf, newlyName, id, present)
  rebindPatch(patch, saveCampaignSave(sf))
}

/** Check-all style: one tree rewrite for many IDs (aligns with ac8-save-editor page Unlock All). */
export function setContainsManyU32(
  patch: CampaignSavePatch,
  name: string,
  ids: readonly number[],
  present: boolean,
  newlyName?: string
): void {
  if (ids.length === 0) return
  const sf = loadCampaignSave(patch.bytes)
  setContainsManyU32OnSave(sf, name, ids, present)
  if (newlyName) setContainsManyU32OnSave(sf, newlyName, ids, present)
  rebindPatch(patch, saveCampaignSave(sf))
}

function catalogOpts(id: number, unlockAllSp: boolean): OwnedAircraftOptions {
  const info = aircraftInfo(id)
  return {
    flags: DEFAULT_OWNED_FLAGS,
    category: info?.category ?? '',
    spWeapons: info?.spWeapons ?? [],
    unlockAllSp,
    weaponOrder: WEAPON_ORDER
  }
}

export function setOwnedAircraft(
  patch: CampaignSavePatch,
  id: number,
  owned: boolean,
  unlockAllSp = false
): void {
  const sf = loadCampaignSave(patch.bytes)
  setOwnedAircraftOnSave(sf, id, owned, catalogOpts(id, unlockAllSp))
  rebindPatch(patch, saveCampaignSave(sf))
}

export function setOwnedWeapon(
  patch: CampaignSavePatch,
  planeId: number,
  weaponId: string,
  owned: boolean
): void {
  const info = aircraftInfo(planeId)
  const sf = loadCampaignSave(patch.bytes)
  setOwnedWeaponOnSave(sf, planeId, weaponId, owned, info?.category ?? '', WEAPON_ORDER)
  rebindPatch(patch, saveCampaignSave(sf))
}
