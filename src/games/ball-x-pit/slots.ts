import type { ListedFile, ListedFiles, SlotInfo } from '@sdk/types'
import { validateEnvelope } from './model/binary'

const META = /^meta(\d+)\.yankai$/i
const BACKUP = /^meta(\d+)_backup\.yankai$/i

function basename(relativePath: string): string {
  const parts = relativePath.split(/[/\\]/)
  return parts[parts.length - 1] ?? relativePath
}

function findByName(files: ListedFile[], name: string): ListedFile | undefined {
  const lower = name.toLowerCase()
  return files.find((f) => basename(f.relativePath).toLowerCase() === lower)
}

function tryPlaySummary(info: ListedFile | undefined): string | undefined {
  if (!info?.bytes || info.bytes.length < 8) return undefined
  // Best-effort: UTF-16LE scan for NumLvlsCompleted value is fragile; show size hint instead if needed.
  // Prefer a short readable note from file size of meta.
  return undefined
}

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const metas: { n: number; file: ListedFile }[] = []
  for (const file of listed.files) {
    const m = basename(file.relativePath).match(META)
    if (!m) continue
    // skip backup files matched by meta*.yankai if pattern is greedy — backup has _backup
    if (BACKUP.test(basename(file.relativePath))) continue
    metas.push({ n: Number(m[1]), file })
  }
  metas.sort((a, b) => a.n - b.n)

  const info = findByName(listed.files, 'saveslotinfo.balls')
  const out: SlotInfo[] = []
  for (const { n, file } of metas) {
    const backupName = `meta${n}_backup.yankai`
    const backup = findByName(listed.files, backupName)
    const sessionFiles = [file.relativePath]
    if (backup) sessionFiles.push(backup.relativePath)
    if (info) sessionFiles.push(info.relativePath)

    if (file.bytes === null) {
      out.push({
        id: `meta-${n}`,
        exists: true,
        readable: false,
        title: `存档 ${n}`,
        sessionFiles
      })
      continue
    }

    let readable = false
    try {
      validateEnvelope(file.bytes)
      readable = true
    } catch {
      readable = false
    }

    const play = tryPlaySummary(info)
    out.push({
      id: `meta-${n}`,
      exists: true,
      readable,
      title: `存档 ${n}`,
      subtitle: play ?? `${file.bytes.length} B`,
      sessionFiles
    })
  }
  return out
}

export function parseMetaSlotId(id: string): number | null {
  const m = /^meta-(\d+)$/.exec(id)
  return m ? Number(m[1]) : null
}

export { META, BACKUP, basename, findByName }
