export interface ResourceField {
  path: string
  value: number
  /** Host i18n key, e.g. wb.resources.silver */
  labelKey: string
}

/** Player-facing currency fields only — not run/lifetime statistics dumps. */
const RESOURCE_ALLOWLIST: { path: string; labelKey: string }[] = [
  { path: 'silver', labelKey: 'wb.resources.silver' },
  { path: 'silverBeforeLastRun', labelKey: 'wb.resources.silverBeforeLastRun' }
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
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
