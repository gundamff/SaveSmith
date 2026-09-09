import unlockCatalogJson from '../data/unlock-catalog.json'

export interface ResourceField {
  path: string
  value: number
  /** Host i18n key, e.g. wb.resources.silver */
  labelKey: string
}

export interface UnlockCatalogEntry {
  id: string
  unlockableID: number
  myType: number
  typeName: string
  /** @deprecated prefer nameEn; kept for older callers */
  name: string
  nameEn: string
  /** Official Simplified Chinese from game LocaTest_zh; falls back to nameEn when missing */
  nameZh: string
  price: number
}

/** Player-facing currency fields only — not run/lifetime statistics dumps. */
const RESOURCE_ALLOWLIST: { path: string; labelKey: string }[] = [
  { path: 'silver', labelKey: 'wb.resources.silver' },
  { path: 'silverBeforeLastRun', labelKey: 'wb.resources.silverBeforeLastRun' }
]

const UNLOCK_CATALOG: UnlockCatalogEntry[] = (
  unlockCatalogJson as { catalog: UnlockCatalogEntry[] }
).catalog.map((e) => {
  const nameEn = e.nameEn || e.name
  const nameZh = e.nameZh || nameEn
  return { ...e, name: nameEn, nameEn, nameZh }
})

const CATALOG_ID_SET = new Set(UNLOCK_CATALOG.map((e) => e.unlockableID))

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

export function listUnlockCatalog(): UnlockCatalogEntry[] {
  return UNLOCK_CATALOG
}

/** App locale → display label; missing zh falls back to English. */
export function unlockDisplayName(
  entry: UnlockCatalogEntry,
  appLocale: 'zh' | 'en'
): string {
  if (appLocale === 'zh') return entry.nameZh || entry.nameEn || entry.name
  return entry.nameEn || entry.name
}

export function getUnlockedIDs(doc: Record<string, unknown>): number[] {
  const raw = doc.unlockedIDs
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
}

function writeUnlockedIDs(doc: Record<string, unknown>, ids: number[]): void {
  doc.unlockedIDs = [...ids]
}

/** Toggle one catalog (or any) unlockable ID; preserves other entries. */
export function setUnlockId(doc: Record<string, unknown>, id: number, on: boolean): void {
  const cur = getUnlockedIDs(doc)
  const i = cur.indexOf(id)
  if (on && i < 0) cur.push(id)
  if (!on && i >= 0) cur.splice(i, 1)
  writeUnlockedIDs(doc, cur)
}

/**
 * Unlock or clear all catalog entries.
 * IDs not in the catalog (unknown / future) are preserved either way.
 */
export function setUnlockedIDsFromCatalog(doc: Record<string, unknown>, unlockAll: boolean): void {
  const cur = getUnlockedIDs(doc)
  const unknown = cur.filter((id) => !CATALOG_ID_SET.has(id))
  if (unlockAll) {
    writeUnlockedIDs(doc, [...unknown, ...UNLOCK_CATALOG.map((e) => e.unlockableID)])
  } else {
    writeUnlockedIDs(doc, unknown)
  }
}
