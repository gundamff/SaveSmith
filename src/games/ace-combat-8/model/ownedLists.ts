import { rebindPatch, type CampaignSavePatch } from './campaignSave'
import {
  loadCampaignSave,
  saveCampaignSave,
  setContainsU32OnSave,
  setOwnedAircraftOnSave
} from './ue54'
import {
  findUInt32ByteMapProperty,
  readUInt32ByteMap
} from './gvas'

const DEFAULT_OWNED_FLAGS = 4

export function readOwnedAircraftIds(bytes: Uint8Array): number[] {
  const field = findUInt32ByteMapProperty(bytes, 'OwnedAircrafts')
  if (!field) return []
  return [...readUInt32ByteMap(bytes, field).keys()]
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

export function setOwnedAircraft(patch: CampaignSavePatch, id: number, owned: boolean): void {
  const sf = loadCampaignSave(patch.bytes)
  setOwnedAircraftOnSave(sf, id, owned, DEFAULT_OWNED_FLAGS)
  rebindPatch(patch, saveCampaignSave(sf))
}
