import { displayName } from '../names'

export { displayName }

export interface ResourceField {
  path: string
  value: number
  /** Host i18n key, e.g. wb.resources.silver */
  labelKey: string
}

export interface UnlockEntry {
  id: string
  unlocked: boolean
}

/** Player-facing currency fields only — not run/lifetime statistics dumps. */
const RESOURCE_ALLOWLIST: { path: string; labelKey: string }[] = [
  { path: 'silver', labelKey: 'wb.resources.silver' },
  { path: 'silverBeforeLastRun', labelKey: 'wb.resources.silverBeforeLastRun' }
]

const UNLOCK_MEMBERSHIP_KEY = 'unlockedIDs'

/** Session-stable unlock ids so unchecked entries remain visible in the editor. */
const listedUnlockIds = new WeakMap<object, Set<string>>()

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
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
  for (const { path, labelKey } of RESOURCE_ALLOWLIST) {
    const value = getByPath(doc, path)
    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ path, value, labelKey })
    }
  }
  return out
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
  const universe = unlockUniverse(doc)
  const idStr = String(n)
  if (!universe.has(idStr)) return
  const arr = intArray(doc, UNLOCK_MEMBERSHIP_KEY)
  doc[UNLOCK_MEMBERSHIP_KEY] = arr
  const i = arr.indexOf(n)
  if (unlocked && i < 0) arr.push(n)
  if (!unlocked && i >= 0) arr.splice(i, 1)
}
