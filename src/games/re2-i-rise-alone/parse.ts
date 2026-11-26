import { ModuleError } from '@sdk/error'
import type { ParseContext, SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import {
  listSlotMetas,
  openBagFromCipher,
  parseSavedData,
  readSavedDataJson,
  sealBag,
  type StringBag
} from './model/bag'
import { readResources, writeResource, type ResourceKey } from './model/resources'

export interface Re2IraState {
  relativePath: string
  slotId: string
  kind: 'manual' | 'auto'
  originalCipher: Uint8Array
  rawPlain: string
  bag: StringBag
  savedRaw: Record<string, unknown>
  data: Record<string, string>
  resources: Partial<Record<ResourceKey, number>>
  dirty: boolean
}

export function parse(files: SlotBytes[], ctx?: ParseContext): Re2IraState {
  const file = files.find((f) => /savedata\.dat$/i.test(f.relativePath.replace(/\\/g, '/')))
  if (!file) throw new ModuleError('MISSING_FIELD', ['SaveData.dat'])
  const opened = openBagFromCipher(file.bytes)
  const metas = listSlotMetas(opened.bag)
  const slotId =
    ctx?.slotId && metas.some((m) => m.id === ctx.slotId) ? ctx.slotId : metas[0]?.id
  if (!slotId) throw new ModuleError('MISSING_FIELD', ['slot'])
  const meta = metas.find((m) => m.id === slotId)!
  const json = readSavedDataJson(opened.bag, slotId)
  const parsed = parseSavedData(json)
  return {
    relativePath: file.relativePath,
    slotId,
    kind: meta.kind,
    originalCipher: opened.originalCipher,
    rawPlain: opened.rawPlain,
    bag: opened.bag,
    savedRaw: parsed.raw,
    data: parsed.Data,
    resources: readResources(parsed.Data),
    dirty: false
  }
}

export function setResource(state: Re2IraState, key: ResourceKey, value: number): void {
  writeResource(state.data, key, value)
  state.savedRaw.Data = state.data
  state.bag.set(`${state.slotId}_Data`, JSON.stringify(state.savedRaw))
  state.resources = readResources(state.data)
  state.dirty = true
}

export function serialize(state: Re2IraState): SerializedFile[] {
  const bytes = sealBag({
    bag: state.bag,
    rawPlain: state.rawPlain,
    originalCipher: state.originalCipher,
    dirtySlotIds: state.dirty ? new Set([state.slotId]) : new Set()
  })
  return [{ relativePath: state.relativePath, bytes }]
}

export function validate(state: Re2IraState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const [k, v] of Object.entries(state.resources)) {
    if (v === undefined) continue
    if (!Number.isInteger(v) || v < 0) issues.push({ code: 'INVALID_FORMAT', args: [k] })
  }
  return issues
}