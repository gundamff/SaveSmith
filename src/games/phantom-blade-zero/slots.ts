import type { ListedFiles, SlotInfo } from '@sdk/types'

const MAIN_SAVE = /^PBZSaveGame\.sav$/i

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const file = listed.files.find(
    ({ relativePath }) =>
      !relativePath.includes('/') &&
      !relativePath.includes('\\') &&
      MAIN_SAVE.test(relativePath)
  )
  if (!file) return []

  return [
    {
      id: 'pbz-main',
      exists: true,
      readable: file.bytes !== null,
      title: 'PBZSaveGame.sav',
      sessionFiles: [file.relativePath]
    }
  ]
}
