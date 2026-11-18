import { applyToIdenticalSlots, type IdenticalSlot } from './identicalSlots'

const HIDDEN = /^quest\.不灭侠胆\.隐藏目标点(\d+)$/
const successTag = (n: number) => `pz.不灭侠胆.帮助正道解脱${n}`

interface FlowerHit {
  actor: Record<string, unknown>
  info: Record<string, unknown>
  infoWasString: boolean
  owner: Record<string, unknown>
  pipeline: Record<string, unknown> | null
  n: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readInfo(actor: Record<string, unknown>): { info: Record<string, unknown>; infoWasString: boolean } | null {
  const raw = actor.ComponentInfoJson
  if (isRecord(raw)) return { info: raw, infoWasString: false }
  if (typeof raw !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    return { info: parsed, infoWasString: true }
  } catch {
    return null
  }
}

function hiddenLeader(info: Record<string, unknown>): number | null {
  if (!Array.isArray(info.EventTag)) return null
  const tags = info.EventTag.filter((tag): tag is string => typeof tag === 'string')
  if (tags.some((tag) => /^pz\.不灭侠胆\.帮助正道解脱\d+$/.test(tag))) return null
  const match = tags.map((tag) => HIDDEN.exec(tag)).find((found) => found !== null)
  if (!match) return null
  const n = Number(match[1])
  if (n < 1 || n > 6) return null
  return n
}

function collect(document: Record<string, unknown>): FlowerHit[] {
  const hits: FlowerHit[] = []
  const walk = (value: unknown, key: string | null, pipeline: Record<string, unknown> | null) => {
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, key, pipeline)
      return
    }
    if (!isRecord(value)) return
    const nextPipeline = key === 'EventPipeline' ? value : pipeline
    if (value.HasDestory !== true && Array.isArray(value.ComponentsOwnerActorInfo)) {
      const parsed = readInfo(value)
      const n = parsed ? hiddenLeader(parsed.info) : null
      const owner = value.ComponentsOwnerActorInfo.find(
        (entry) => isRecord(entry) && entry.OwnerVisible === false
      )
      if (parsed && n !== null && isRecord(owner)) {
        hits.push({ actor: value, info: parsed.info, infoWasString: parsed.infoWasString, owner, pipeline: nextPipeline, n })
      }
    }
    for (const [childKey, child] of Object.entries(value)) walk(child, childKey, nextPipeline)
  }
  walk(document, null, null)
  return hits
}

export function listMissedMandateFlowers(document: Record<string, unknown>): number[] {
  return [...new Set(collect(document).map((hit) => hit.n))].sort((a, b) => a - b)
}

function restoreDocument(document: Record<string, unknown>): number[] {
  const leaders: number[] = []
  for (const hit of collect(document)) {
    delete hit.owner.OwnerVisible
    hit.info.EventTag = [successTag(hit.n)]
    if (hit.infoWasString) hit.actor.ComponentInfoJson = JSON.stringify(hit.info)
    const tags = hit.pipeline?.GlobalTags
    if (Array.isArray(tags) && tags.every((tag) => typeof tag === 'string') && !tags.includes(successTag(hit.n))) {
      tags.push(successTag(hit.n))
    }
    leaders.push(hit.n)
  }
  return [...new Set(leaders)].sort((a, b) => a - b)
}

export function restoreMissedMandateFlowers(
  slots: readonly IdenticalSlot[],
  slotName: string
): { leaders: number[] } {
  const source = slots.find((slot) => slot.name === slotName)
  let leaders: number[] = []
  applyToIdenticalSlots(slots, slotName, (document) => {
    const restored = restoreDocument(document)
    if (source && document === source.document) leaders = restored
    return restored.length > 0
  })
  return { leaders }
}