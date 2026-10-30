import {
  getSelectedSlot,
  selectSlot,
  type PbzSaveModel
} from '../model/saveModel'

const DEFAULT_DIRTY_MESSAGE =
  '当前槽的修改仍会保留，并在保存时一起写入。确定切换槽位吗？'

export function requestSlotSelection(
  model: PbzSaveModel,
  targetSlotName: string,
  confirm: (message: string) => boolean,
  dirtyMessage = DEFAULT_DIRTY_MESSAGE
): boolean {
  if (targetSlotName === model.selectedSlotName) return false

  const current = getSelectedSlot(model)
  if (current?.dirty && !confirm(dirtyMessage)) return false

  selectSlot(model, targetSlotName)
  return true
}
