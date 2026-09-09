import type { SlotInfo } from '@sdk/types'

export function windowTitle(appName: string, gameName: string | null | undefined): string {
  if (!gameName) return appName
  return `${gameName} — ${appName}`
}

export function currentSlotLabel(
  slots: Array<Pick<SlotInfo, 'id' | 'title'>>,
  currentSlotId: string | null
): string | null {
  if (!currentSlotId) return null
  const slot = slots.find((s) => s.id === currentSlotId)
  if (!slot) return null
  const title = slot.title?.trim()
  return title || slot.id
}
