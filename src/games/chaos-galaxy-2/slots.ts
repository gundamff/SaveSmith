import type { ListedFile, ListedFiles, SlotInfo } from '@sdk/types'
import { getEntry, parseEs3Binary } from './model/es3-binary'

const SLOT_COUNT = 6

export function slotFileName(slot: number): string {
  return `savedata${slot}.cg2`
}

/** Header-only summary from bytes. Does not touch disk. */
export function summarize(bytes: Uint8Array): { playerName?: string } | null {
  try {
    const entries = parseEs3Binary(bytes)
    const playerName = getEntry(entries, 'PlayerName')?.value
    return {
      playerName: typeof playerName === 'string' ? playerName : undefined
    }
  } catch {
    return null
  }
}

function findFile(files: ListedFile[], name: string): ListedFile | undefined {
  const lower = name.toLowerCase()
  return files.find((f) => f.relativePath.toLowerCase() === lower)
}

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const hasConfig = findFile(listed.files, 'config.cg2') !== undefined
  const out: SlotInfo[] = []

  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const name = slotFileName(slot)
    const file = findFile(listed.files, name)
    if (!file) {
      out.push({ id: String(slot), exists: false, readable: false, sessionFiles: [] })
      continue
    }
    if (file.bytes === null) {
      out.push({ id: String(slot), exists: true, readable: false, sessionFiles: [] })
      continue
    }
    const header = summarize(file.bytes)
    if (!header) {
      out.push({ id: String(slot), exists: true, readable: false, sessionFiles: [] })
      continue
    }
    const sessionFiles = hasConfig ? [name, 'config.cg2'] : [name]
    out.push({
      id: String(slot),
      exists: true,
      readable: true,
      title: header.playerName,
      sessionFiles
    })
  }

  return out
}
