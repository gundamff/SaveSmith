export interface SidecarSummary {
  teamName: string
  gold: number
  season: number
  week: number
  savedAtText?: string
  logoPath?: string
  gameDifficulty?: number
  challengeTowerTeamSubmitted?: boolean
}

function asFiniteNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

/** Parse campaign sidecar JSON text. Returns null if unusable. */
export function parseSidecarJson(text: string): SidecarSummary | null {
  let doc: unknown
  try {
    doc = JSON.parse(text) as unknown
  } catch {
    return null
  }
  if (!doc || typeof doc !== 'object') return null
  const o = doc as Record<string, unknown>
  if (typeof o.team_name !== 'string' || o.team_name.length === 0) return null
  const gold = asFiniteNumber(o.gold)
  const season = asFiniteNumber(o.season)
  const week = asFiniteNumber(o.week)
  if (gold === undefined || season === undefined || week === undefined) return null
  const out: SidecarSummary = {
    teamName: o.team_name,
    gold,
    season,
    week
  }
  if (typeof o.saved_at_text === 'string') out.savedAtText = o.saved_at_text
  if (typeof o.logo_path === 'string') out.logoPath = o.logo_path
  const difficulty = asFiniteNumber(o.game_difficulty)
  if (difficulty !== undefined) out.gameDifficulty = difficulty
  if (typeof o.challenge_tower_team_submitted === 'boolean') {
    out.challengeTowerTeamSubmitted = o.challenge_tower_team_submitted
  }
  return out
}

export function parseSidecarBytes(bytes: Uint8Array): SidecarSummary | null {
  return parseSidecarJson(new TextDecoder().decode(bytes))
}
