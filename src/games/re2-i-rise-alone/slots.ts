import type { ListedFiles, SlotInfo } from '@sdk/types'
import { listSlotMetas, openBagFromCipher } from './model/bag'

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const file = listed.files.find(
    (f) =>
      f.relativePath.replace(/\\/g, '/') === 'SaveData.dat' ||
      f.relativePath.toLowerCase().endsWith('savedata.dat')
  )
  if (!file?.bytes) {
    return file
      ? [{ id: 'SaveData.dat', exists: true, readable: false, sessionFiles: ['SaveData.dat'] }]
      : []
  }
  try {
    const { bag } = openBagFromCipher(file.bytes)
    return listSlotMetas(bag).map((m) => ({
      id: m.id,
      exists: true,
      readable: true,
      title: m.savedName.trim() || m.id.slice(0, 8),
      subtitle: `${m.kind === 'auto' ? '自动' : '手动'} · R${m.round}`,
      sessionFiles: ['SaveData.dat']
    }))
  } catch {
    return [{ id: 'SaveData.dat', exists: true, readable: false, sessionFiles: ['SaveData.dat'] }]
  }
}