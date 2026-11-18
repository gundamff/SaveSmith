import { ModuleError } from '../../../sdk/error'

export interface IdenticalSlot {
  name: string
  document: Record<string, unknown>
  dirty: boolean
}

export function applyToIdenticalSlots(
  slots: readonly IdenticalSlot[],
  slotName: string,
  mutate: (document: Record<string, unknown>) => boolean
): void {
  const source = slots.find((slot) => slot.name === slotName)
  if (!source) throw new ModuleError('PBZ_INVALID_EDIT', [slotName])
  const before = JSON.stringify(source.document)
  if (!mutate(source.document)) return
  source.dirty = true
  for (const slot of slots) {
    if (slot.name === source.name) continue
    if (JSON.stringify(slot.document) !== before) continue
    mutate(slot.document)
    slot.dirty = true
  }
}