import { describe, expect, it } from 'vitest'
import { matchSlotFilePatterns } from '@sdk/session'

describe('matchSlotFilePatterns', () => {
  it('matches single-segment star', () => {
    const paths = [
      'Saves/Playtest/Generation_0001/SaveData.json',
      'Saves/Playtest/Generation_0002/SaveData.json',
      'Saves/Playtest/Generation_0002/SaveData.backup.json',
      'Player.log'
    ]
    expect(
      matchSlotFilePatterns(paths, ['Saves/Playtest/Generation_*/SaveData.json'])
    ).toEqual([
      'Saves/Playtest/Generation_0001/SaveData.json',
      'Saves/Playtest/Generation_0002/SaveData.json'
    ])
  })

  it('matches multi-star segment (DragonSword slots)', () => {
    const paths = [
      '136330193/136330193_Slot1.db',
      '136330193/136330193_Slot2.db',
      '136330193/other.db',
      'readme.txt'
    ]
    expect(matchSlotFilePatterns(paths, ['*/*_Slot*.db'])).toEqual([
      '136330193/136330193_Slot1.db',
      '136330193/136330193_Slot2.db'
    ])
  })

  it('is case-insensitive for multi-star', () => {
    expect(matchSlotFilePatterns(['Acct/Acct_Slot1.DB'], ['*/*_slot*.db'])).toEqual([
      'Acct/Acct_Slot1.DB'
    ])
  })
})
