import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/wanderburg/slots'

describe('wanderburg listSlots', () => {
  it('maps Generation folders to slots', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        {
          relativePath: 'Saves/Playtest/Generation_0002/SaveData.json',
          bytes: new Uint8Array([1])
        }
      ]
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      id: 'generation-0002',
      exists: true,
      readable: true,
      title: 'Generation 0002',
      sessionFiles: ['Saves/Playtest/Generation_0002/SaveData.json']
    })
  })

  it('marks missing bytes unreadable', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        {
          relativePath: 'Saves/Playtest/Generation_0001/SaveData.json',
          bytes: null
        }
      ]
    })
    expect(slots[0]!.readable).toBe(false)
  })
})
