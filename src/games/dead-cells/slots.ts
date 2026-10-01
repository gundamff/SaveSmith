import type { ListedFiles, SlotInfo } from '@sdk/types'

const USER_SLOT = /^user_(\d+)\.dat$/i

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []
  for (const file of listed.files) {
    const name = file.relativePath.replace(/\\/g, '/').split('/').pop() ?? ''
    const match = name.match(USER_SLOT)
    if (!match) continue
    const num = match[1]!
    out.push({
      id: `user-${num}`,
      exists: true,
      readable: file.bytes !== null,
      title: `user_${num}.dat`,
      sessionFiles: [file.relativePath]
    })
  }
  out.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  return out
}
