import { utf8Decode } from '@sdk/session'
import type { ListedFiles, SlotInfo } from '@sdk/types'

const BUILD_SAVE = /^BuildSave_(\d+)\.sav$/i

function basename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return slash >= 0 ? normalized.slice(slash + 1) : normalized
}

function subtitleFromBytes(bytes: Uint8Array): string | undefined {
  try {
    const root = JSON.parse(utf8Decode(bytes)) as Record<string, unknown>
    const playerSave = root.playerSave
    if (!playerSave || typeof playerSave !== 'object' || Array.isArray(playerSave)) return undefined
    const ps = playerSave as Record<string, unknown>
    const level = ps.level
    const saveDate = ps.saveDate
    if (typeof level !== 'number' || typeof saveDate !== 'string') return undefined
    return `Lv.${level} · ${saveDate}`
  } catch {
    return undefined
  }
}

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []
  for (const file of listed.files) {
    const match = basename(file.relativePath).match(BUILD_SAVE)
    if (!match) continue
    const n = match[1]!
    const readable = file.bytes !== null
    const slot: SlotInfo = {
      id: `build-${n}`,
      exists: true,
      readable,
      sessionFiles: [file.relativePath]
    }
    if (readable && file.bytes) {
      const subtitle = subtitleFromBytes(file.bytes)
      if (subtitle) slot.subtitle = subtitle
    }
    out.push(slot)
  }
  out.sort((a, b) => {
    const na = Number(a.id.slice('build-'.length))
    const nb = Number(b.id.slice('build-'.length))
    return na - nb
  })
  return out
}
