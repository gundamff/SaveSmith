import type { ListedFiles, SlotInfo } from '@sdk/types'

const GENERATION_SAVE = /Generation_(\d+)\/SaveData\.json$/i

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []
  for (const file of listed.files) {
    const match = file.relativePath.match(GENERATION_SAVE)
    if (!match) continue
    const num = match[1]!
    const id = `generation-${num.padStart(4, '0')}`
    const exists = true
    const readable = file.bytes !== null
    out.push({
      id,
      exists,
      readable,
      title: `Generation ${num.padStart(4, '0')}`,
      sessionFiles: [file.relativePath]
    })
  }
  out.sort((a, b) => a.id.localeCompare(b.id))
  return out
}
