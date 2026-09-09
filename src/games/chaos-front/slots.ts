import { utf8Decode } from '@sdk/session'
import type { ListedFile, ListedFiles, SlotInfo } from '@sdk/types'
import { parseJsonLoose } from './model/es3'

const SLOT_COUNT = 6

export function slotFileName(slot: number): string {
  return `savedata${slot}.cf`
}

/** Header-only summary from bytes. Does not touch disk. */
export function summarize(bytes: Uint8Array): {
  armyName?: string
  leaderName?: string
  day?: number
  saveTime?: string
  flag?: number
  unitCount?: number
} | null {
  try {
    const doc = parseJsonLoose(utf8Decode(bytes)) as Record<string, { value?: unknown }>
    const value = (k: string): unknown => doc[k]?.value
    const units = doc['PlayerUnits']?.value
    return {
      armyName: value('PlayArmyName') as string | undefined,
      leaderName: value('PlayerLeaderName') as string | undefined,
      day: value('PlayerDay') as number | undefined,
      saveTime: value('RealTime') as string | undefined,
      flag: value('PlayerFlag') as number | undefined,
      unitCount: Array.isArray(units) ? units.length : undefined
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
    out.push({
      id: String(slot),
      exists: true,
      readable: true,
      title: header.armyName,
      subtitle: header.day !== undefined ? String(header.day) : undefined,
      sessionFiles: [name, 'collection.cf']
    })
  }
  return out
}
