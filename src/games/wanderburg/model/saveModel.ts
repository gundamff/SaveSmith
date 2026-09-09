import { displayName } from '../names'

export { displayName }

export interface ResourceField {
  path: string
  value: number
}

export interface UnlockEntry {
  id: string
  unlocked: boolean
}

const MAX_RESOURCE_DEPTH = 3

/** Pure integer arrays used as ID / unlock lists — not editable resources. */
const SKIP_INT_ARRAY_KEYS = new Set([
  'unlockedIDs',
  'unlockedAndNew',
  'lastLoadout',
  'lastDeco'
])

const UNLOCK_MEMBERSHIP_KEY = 'unlockedIDs'

/** Session-stable unlock ids so unchecked entries remain visible in the editor. */
const listedUnlockIds = new WeakMap<object, Set<string>>()

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isPureIntArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isInteger(x))
}

function intArray(doc: Record<string, unknown>, key: string): number[] {
  const v = doc[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is number => typeof x === 'number' && Number.isInteger(x))
}

function unlockUniverse(doc: Record<string, unknown>): Set<string> {
  let set = listedUnlockIds.get(doc)
  if (!set) {
    set = new Set<string>()
    listedUnlockIds.set(doc, set)
  }
  for (const n of intArray(doc, UNLOCK_MEMBERSHIP_KEY)) {
    set.add(String(n))
  }
  return set
}

export function getByPath(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = doc
  for (const part of parts) {
    if (!isRecord(cur)) return undefined
    cur = cur[part]
  }
  return cur
}

export function setByPath(doc: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  if (parts.length === 0) return
  let cur: Record<string, unknown> = doc
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    const next = cur[part]
    if (!isRecord(next)) {
      const created: Record<string, unknown> = {}
      cur[part] = created
      cur = created
    } else {
      cur = next
    }
  }
  cur[parts[parts.length - 1]!] = value
}

export function listResourceFields(doc: Record<string, unknown>): ResourceField[] {
  const out: ResourceField[] = []

  function walk(obj: Record<string, unknown>, prefix: string, depth: number): void {
    if (depth > MAX_RESOURCE_DEPTH) return
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'number' && Number.isFinite(value)) {
        out.push({ path, value })
        continue
      }
      if (isPureIntArray(value) && SKIP_INT_ARRAY_KEYS.has(key)) {
        continue
      }
      if (isRecord(value)) {
        walk(value, path, depth + 1)
      }
    }
  }

  walk(doc, '', 1)
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

export function listUnlockEntries(doc: Record<string, unknown>): UnlockEntry[] {
  const universe = unlockUniverse(doc)
  const unlocked = new Set(intArray(doc, UNLOCK_MEMBERSHIP_KEY).map(String))
  return [...universe]
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({ id, unlocked: unlocked.has(id) }))
}

export function setUnlock(doc: Record<string, unknown>, id: string, unlocked: boolean): void {
  const n = Number(id)
  if (!Number.isInteger(n)) return
  const arr = intArray(doc, UNLOCK_MEMBERSHIP_KEY)
  doc[UNLOCK_MEMBERSHIP_KEY] = arr
  const i = arr.indexOf(n)
  unlockUniverse(doc).add(String(n))
  if (unlocked && i < 0) arr.push(n)
  if (!unlocked && i >= 0) arr.splice(i, 1)
}
