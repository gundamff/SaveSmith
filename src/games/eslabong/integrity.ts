/**
 * Eslabong sidecar integrity.
 *
 * Formula (confirmed against local campaign_*.json + .res pairs):
 *   key = SHA256(utf8("eslabong_v1_9d4f2a7c_save_integrity_salt"))
 *   integrity = HMAC-SHA256(key, raw .res bytes) as lowercase hex
 *
 * Uses node-forge (same as dragon-sword) so Vite/Tauri WebView builds work —
 * do not import `node:crypto` here.
 *
 * `campaign_lineage_hmac` is preserved by default; its formula is not
 * required for .res-only edits that keep lineage_id unchanged.
 */
import forge from 'node-forge'

export const ESLABONG_INTEGRITY_SALT = 'eslabong_v1_9d4f2a7c_save_integrity_salt'

export interface SidecarDoc {
  gold: number
  team_name: string
  season: number
  week: number
  // keep unknown keys when rewriting
  [k: string]: unknown
}

function bytesToBinary(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]!)
  }
  return s
}

function integrityKey(): string {
  const md = forge.md.sha256.create()
  md.update(ESLABONG_INTEGRITY_SALT, 'utf8')
  return md.digest().getBytes()
}

function hmacSha256Hex(keyBinary: string, data: Uint8Array): string {
  const hmac = forge.hmac.create()
  hmac.start('sha256', keyBinary)
  hmac.update(bytesToBinary(data))
  return hmac.digest().toHex()
}

/** Returns hex digest matching game `integrity` field, or throws. */
export function computeIntegrity(args: {
  sidecar: SidecarDoc
  resBytes: Uint8Array
}): string {
  const { resBytes } = args
  if (!(resBytes instanceof Uint8Array) || resBytes.byteLength === 0) {
    throw new Error('computeIntegrity: resBytes required')
  }
  return hmacSha256Hex(integrityKey(), resBytes)
}

/** Recompute `integrity`; preserve `campaign_lineage_*` and other keys. */
export function applyIntegrityFields(
  sidecar: Record<string, unknown>,
  resBytes: Uint8Array
): Record<string, unknown> {
  const gold = sidecar.gold
  const team_name = sidecar.team_name
  const season = sidecar.season
  const week = sidecar.week
  if (typeof gold !== 'number' || !Number.isFinite(gold)) {
    throw new Error('applyIntegrityFields: gold must be a finite number')
  }
  if (typeof team_name !== 'string' || team_name.length === 0) {
    throw new Error('applyIntegrityFields: team_name required')
  }
  if (typeof season !== 'number' || !Number.isFinite(season)) {
    throw new Error('applyIntegrityFields: season must be a finite number')
  }
  if (typeof week !== 'number' || !Number.isFinite(week)) {
    throw new Error('applyIntegrityFields: week must be a finite number')
  }
  const doc: SidecarDoc = {
    ...(sidecar as SidecarDoc),
    gold,
    team_name,
    season,
    week
  }
  return {
    ...sidecar,
    integrity: computeIntegrity({ sidecar: doc, resBytes })
  }
}
