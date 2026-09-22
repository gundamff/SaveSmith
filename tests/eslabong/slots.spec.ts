import { describe, expect, it } from 'vitest'
import { identifySaveDir } from '@sdk/session'
import { locate } from '../../src/games/eslabong/locate'
import { listSlots } from '../../src/games/eslabong/slots'

const enc = (obj: unknown) => new TextEncoder().encode(JSON.stringify(obj))

describe('eslabong locate', () => {
  it('matches autosave or manual campaign json names', () => {
    expect(identifySaveDir(locate, ['campaign_autosave.json'])).toBe(true)
    expect(identifySaveDir(locate, ['campaign_save_0.json'])).toBe(true)
    expect(identifySaveDir(locate, ['settings.cfg', 'logs'])).toBe(false)
  })

  it('does not list numbered autosave history files', () => {
    expect(locate.slotFilePatterns).toEqual(['campaign_save_*.json', 'campaign_autosave.json'])
  })
})

describe('eslabong listSlots', () => {
  it('lists manuals then current autosave; ignores autosave_N history', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        {
          relativePath: 'campaign_autosave_1.json',
          bytes: enc({ team_name: '历史', gold: 1, season: 1, week: 1 })
        },
        {
          relativePath: 'campaign_autosave.json',
          bytes: enc({
            team_name: '好好',
            gold: 99,
            season: 3,
            week: 23,
            saved_at_text: '2026-09-16 21:12'
          })
        },
        {
          relativePath: 'campaign_save_2.json',
          bytes: enc({ team_name: '好好', gold: 7169170, season: 3, week: 23 })
        }
      ]
    })
    expect(slots.map((s) => s.id)).toEqual(['save-2', 'autosave'])
    expect(slots[0]).toMatchObject({
      id: 'save-2',
      exists: true,
      readable: true,
      title: '好好',
      sessionFiles: ['campaign_save_2.json', 'campaign_save_2.res']
    })
    expect(slots[0]!.subtitle).toContain('存档位3')
    expect(slots[0]!.subtitle).toContain('手动')
    expect(slots[0]!.subtitle).not.toContain('缺 .res')
    expect(slots[1]!.subtitle).toContain('自动')
    expect(slots[1]!.subtitle).toContain('2026-09-16 21:12')
  })

  it('marks corrupt json unreadable', () => {
    const slots = listSlots({
      dir: 'X',
      files: [{ relativePath: 'campaign_save_2.json', bytes: new TextEncoder().encode('{') }]
    })
    expect(slots[0]).toMatchObject({
      id: 'save-2',
      exists: true,
      readable: false,
      sessionFiles: ['campaign_save_2.json', 'campaign_save_2.res']
    })
  })
})
