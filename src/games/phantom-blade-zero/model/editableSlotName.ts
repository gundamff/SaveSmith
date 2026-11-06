/** Internal PBZS directory names SaveSmith may open and write. */
const EDITABLE_SLOT_NAME = /^(?:AutoSave|ManualSave|NightmareRun)\d+$/

export function isEditableSlotName(name: string): boolean {
  return EDITABLE_SLOT_NAME.test(name)
}
