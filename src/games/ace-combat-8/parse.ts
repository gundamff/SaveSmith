import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import {
  loadCampaignPatch,
  readCampaignView,
  resealChecksum,
  validateCampaignView,
  type CampaignSavePatch,
  type CampaignSaveView
} from './model/campaignSave'

export interface AceCombat8State {
  relativePath: string
  patch: CampaignSavePatch
  view: CampaignSaveView
}

export function parse(files: SlotBytes[]): AceCombat8State {
  const file = files.find((f) => /Campaign\.sav$/i.test(f.relativePath.replace(/\\/g, '/')))
  if (!file) throw new ModuleError('MISSING_FIELD', ['Campaign.sav'])
  const patch = loadCampaignPatch(new Uint8Array(file.bytes))
  const view = readCampaignView(patch)
  return { relativePath: file.relativePath, patch, view }
}

export function serialize(state: AceCombat8State): SerializedFile[] {
  resealChecksum(state.patch)
  return [{ relativePath: state.relativePath, bytes: state.patch.bytes }]
}

export function validate(state: AceCombat8State): ValidationIssue[] {
  try {
    validateCampaignView(state.view)
  } catch (e) {
    if (e instanceof ModuleError) return [{ code: e.code, args: e.args }]
    throw e
  }
  return []
}

export function refreshView(state: AceCombat8State): AceCombat8State {
  state.view = readCampaignView(state.patch)
  return state
}
