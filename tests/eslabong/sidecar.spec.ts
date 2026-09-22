import { describe, expect, it } from 'vitest'
import { parseSidecarJson } from '../../src/games/eslabong/sidecar'

describe('eslabong sidecar', () => {
  it('parses campaign sidecar fields', () => {
    const raw = JSON.stringify({
      campaign_lineage_hmac: 'abc',
      campaign_lineage_id: 'id',
      challenge_tower_team_submitted: false,
      gold: 217,
      integrity: 'hash',
      logo_path: 'res://Art/TeamLogos/Player/1009.png',
      saved_at_text: '2026-08-29 22:14',
      saved_at_unix: 1788012859,
      season: 1,
      team_name: '爸爸很坏',
      week: 8
    })
    expect(parseSidecarJson(raw)).toEqual({
      teamName: '爸爸很坏',
      gold: 217,
      season: 1,
      week: 8,
      savedAtText: '2026-08-29 22:14',
      logoPath: 'res://Art/TeamLogos/Player/1009.png',
      challengeTowerTeamSubmitted: false
    })
  })

  it('keeps optional game_difficulty when present', () => {
    const raw = JSON.stringify({
      team_name: '好好',
      gold: 100,
      season: 3,
      week: 23,
      game_difficulty: 1,
      challenge_tower_team_submitted: true
    })
    expect(parseSidecarJson(raw)).toMatchObject({
      teamName: '好好',
      gameDifficulty: 1,
      challengeTowerTeamSubmitted: true
    })
  })

  it('returns null for invalid json or missing team_name', () => {
    expect(parseSidecarJson('{')).toBeNull()
    expect(parseSidecarJson(JSON.stringify({ gold: 1 }))).toBeNull()
  })
})
