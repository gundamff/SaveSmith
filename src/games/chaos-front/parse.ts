import { ModuleError } from '@sdk/error'
import { utf8Decode, utf8Encode } from '@sdk/session'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import {
  loadCollectionText,
  serializeCollectionText,
  SaveData,
  type CollectionSnapshot
} from './model/saveModel'
import { slotFileName } from './slots'

const SLOT_FILE = /^savedata(\d+)\.cf$/i

export interface ChaosFrontState {
  campaign: SaveData
  collection: CollectionSnapshot | null
  slot: number
}

export function parse(files: SlotBytes[]): ChaosFrontState {
  const campaignFile = files.find((f) => SLOT_FILE.test(basename(f.relativePath)))
  if (!campaignFile) throw new ModuleError('MISSING_FIELD', ['savedata'])
  const match = basename(campaignFile.relativePath).match(SLOT_FILE)
  const slot = match ? Number(match[1]) : 0
  const campaign = SaveData.load(utf8Decode(campaignFile.bytes))
  const colFile = files.find((f) => basename(f.relativePath).toLowerCase() === 'collection.cf')
  let collection: CollectionSnapshot | null = null
  if (colFile) {
    try {
      collection = loadCollectionText(utf8Decode(colFile.bytes))
    } catch {
      collection = null
    }
  }
  return { campaign, collection, slot }
}

export function serialize(state: ChaosFrontState): SerializedFile[] {
  const out: SerializedFile[] = [
    {
      relativePath: slotFileName(state.slot),
      bytes: utf8Encode(state.campaign.serialize())
    }
  ]
  if (state.collection !== null) {
    out.push({
      relativePath: 'collection.cf',
      bytes: utf8Encode(serializeCollectionText(state.collection))
    })
  }
  return out
}

export function validate(state: ChaosFrontState): ValidationIssue[] {
  try {
    state.campaign.assertDeployedHavePilots()
    return []
  } catch (e) {
    if (e instanceof ModuleError) return [{ code: e.code, args: e.args }]
    throw e
  }
}

function basename(relativePath: string): string {
  const parts = relativePath.split(/[/\\]/)
  return parts[parts.length - 1] ?? relativePath
}
