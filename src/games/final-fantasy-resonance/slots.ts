import type { ListedFiles, SlotInfo } from '@sdk/types'
import { decryptSvhd } from './crypto/svhd'
import { getInt, parseGvasIndex } from './model/gvasIndex'

const SAVE = /^GameSaveData(\d+)\.sav$/i

function basename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return slash >= 0 ? normalized.slice(slash + 1) : normalized
}

function subtitleFromBytes(bytes: Uint8Array): string | undefined {
  try {
    const { plain } = decryptSvhd(bytes)
    const index = parseGvasIndex(plain)
    const money = getInt(index, plain, 'Player.currentMoney')
    const play = getInt(index, plain, 'Player.PlayTime')
    return `Gil ${money} · ${Math.floor(play / 3600)}h`
  } catch {
    return undefined
  }
}

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []
  for (const file of listed.files) {
    const match = basename(file.relativePath).match(SAVE)
    if (!match) continue
    const n = Number(match[1])
    const readable = file.bytes !== null
    const slot: SlotInfo = {
      id: `ffr-${n}`,
      title: n === 0 ? 'Autosave' : `Slot ${String(n).padStart(2, '0')}`,
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
  out.sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)))
  return out
}
