import type { ListedFiles, SlotInfo } from '@sdk/types'
import { decryptPlr } from './crypto/plrAes'
import { parsePlayer } from './model/playerModel'

const PLR = /^Players\/([^/\\]+)\.plr$/i

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []
  for (const file of listed.files) {
    const m = file.relativePath.replace(/\\/g, '/').match(PLR)
    if (!m) continue
    const fileName = m[1]!
    let title = fileName
    let readable = file.bytes !== null
    if (file.bytes) {
      try {
        const state = parsePlayer(decryptPlr(file.bytes), file.relativePath)
        title = state.name || fileName
      } catch {
        readable = false
      }
    }
    out.push({
      id: `plr-${fileName}`,
      exists: true,
      readable,
      title,
      subtitle: `${fileName}.plr`,
      sessionFiles: [file.relativePath]
    })
  }
  out.sort((a, b) => a.id.localeCompare(b.id))
  return out
}
