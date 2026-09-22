import type { ListedFiles, SlotInfo } from '@sdk/types'
import { parseSidecarBytes } from './sidecar'

const MANUAL = /^campaign_save_(\d+)\.json$/i
const AUTOSAVE = /^campaign_autosave\.json$/i

type Kind = { kind: 'manual' | 'autosave'; n: number; id: string }

function classify(name: string): Kind | null {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? name
  const m = base.match(MANUAL)
  if (m) return { kind: 'manual', n: Number(m[1]), id: `save-${m[1]}` }
  // Ignore campaign_autosave_N.json (rolling history); only current autosave.
  if (AUTOSAVE.test(base)) return { kind: 'autosave', n: -1, id: 'autosave' }
  return null
}

function resPathFor(jsonPath: string): string {
  return jsonPath.replace(/\.json$/i, '.res')
}

function kindLabel(kind: Kind['kind']): string {
  return kind === 'manual' ? '手动' : '自动'
}

function buildSubtitle(
  kind: Kind,
  summary: { season: number; week: number; gold: number; savedAtText?: string } | null
): string {
  const parts: string[] = [kindLabel(kind.kind)]
  if (kind.kind === 'manual') {
    // Game UI labels campaign_save_N as 存档位(N+1).
    parts.unshift(`存档位${kind.n + 1}`)
  }
  if (summary) {
    parts.push(`S${summary.season} W${summary.week} · ${summary.gold}`)
    if (summary.savedAtText) parts.push(summary.savedAtText)
  }
  return parts.join(' · ')
}

function sortKey(kind: Kind): number {
  if (kind.kind === 'manual') return kind.n
  return 1_000_000
}

export function listSlots(listed: ListedFiles): SlotInfo[] {
  const out: SlotInfo[] = []

  for (const file of listed.files) {
    const path = file.relativePath.replace(/\\/g, '/')
    const kind = classify(path)
    if (!kind) continue
    const resRel = resPathFor(path)
    let readable = false
    let title: string | undefined
    let subtitle: string | undefined
    if (file.bytes) {
      const summary = parseSidecarBytes(file.bytes)
      if (summary) {
        readable = true
        title = summary.teamName
        subtitle = buildSubtitle(kind, summary)
      } else {
        subtitle = buildSubtitle(kind, null)
      }
    } else {
      subtitle = buildSubtitle(kind, null)
    }
    out.push({
      id: kind.id,
      exists: true,
      readable,
      title,
      subtitle,
      sessionFiles: [path, resRel]
    })
  }

  out.sort((a, b) => {
    const ka = classify(a.sessionFiles[0]!)!
    const kb = classify(b.sessionFiles[0]!)!
    return sortKey(ka) - sortKey(kb)
  })
  return out
}
