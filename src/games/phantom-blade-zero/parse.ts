import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import {
  parsePbzsContainer,
  readSlotPayload,
  serializePbzsContainer
} from './codec/container'
import {
  createSaveModel,
  isEditableSlotName,
  parseEditableSlot,
  selectSlot,
  serializeDirtySlots,
  validateSaveModel,
  type PbzSaveModel
} from './model/saveModel'
import type { PbzsContainer } from './model/types'

export interface PhantomBladeZeroState {
  relativePath: string
  container: PbzsContainer
  model: PbzSaveModel
}

export async function parse(files: SlotBytes[]): Promise<PhantomBladeZeroState> {
  const file = files.find(({ relativePath }) => basename(relativePath) === 'PBZSaveGame.sav')
  if (!file) throw new ModuleError('MISSING_FIELD', ['PBZSaveGame.sav'])

  try {
    const container = await parsePbzsContainer(file.bytes)
    const editableSlots = []
    for (const { entry } of container.slots) {
      if (!isEditableSlotName(entry.name)) continue
      const payload = await readSlotPayload(container, entry.name)
      editableSlots.push(parseEditableSlot(entry.name, payload))
    }
    if (editableSlots.length === 0) {
      throw new ModuleError('PBZ_NO_EDITABLE_SLOTS')
    }

    const model = createSaveModel(editableSlots)
    selectSlot(model, editableSlots[0]!.name)
    return { relativePath: file.relativePath, container, model }
  } catch (error) {
    if (error instanceof ModuleError) throw error
    throw new ModuleError('PARSE_FAILED', [file.relativePath])
  }
}

export async function serialize(state: PhantomBladeZeroState): Promise<SerializedFile[]> {
  const issues = validateSaveModel(state.model)
  if (issues.length > 0) {
    throw new ModuleError('PBZ_INVALID_EDIT', [issues[0]!.code])
  }
  const dirtyPayloads = serializeDirtySlots(state.model)
  const bytes = await serializePbzsContainer(state.container, dirtyPayloads)
  return [{ relativePath: state.relativePath, bytes }]
}

export function validate(state: PhantomBladeZeroState): ValidationIssue[] {
  return validateSaveModel(state.model)
}

function basename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}
