import type { ListedFiles, SlotInfo } from '@sdk/types'

const SLOT_DB = /^(\d+)\/\1_Slot(\d+)\.db$/i

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []
  for (const file of listed.files) {
    const path = file.relativePath.replace(/\\/g, '/')
    const match = path.match(SLOT_DB)
    if (!match) continue
    const account = match[1]!
    const slot = match[2]!
    out.push({
      id: `${account}-${slot}`,
      exists: true,
      readable: file.bytes !== null,
      title: `Account ${account}`,
      subtitle: `Slot ${slot}`,
      sessionFiles: [path]
    })
  }
  out.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  return out
}
