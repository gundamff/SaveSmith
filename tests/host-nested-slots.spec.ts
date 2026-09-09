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
})
