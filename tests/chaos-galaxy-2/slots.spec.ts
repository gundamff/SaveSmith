import { describe, expect, it } from 'vitest'
import type { ListedFile } from '@sdk/types'
import { listSlots } from '../../src/games/chaos-galaxy-2/slots'
import { encodeMinimalCampaign, encodeMinimalConfig } from './fixtures'

function listed(files: ListedFile[]) {
  return { dir: 'x', files }
}

describe('listSlots', () => {
  it('lists existing savedata1 with config in sessionFiles', () => {
    const slots = listSlots(
      listed([
        { relativePath: 'savedata1.cg2', bytes: encodeMinimalCampaign() },
        { relativePath: 'config.cg2', bytes: encodeMinimalConfig() }
      ])
    )
    const s1 = slots.find((s) => s.id === '1')!
    expect(s1.exists).toBe(true)
    expect(s1.readable).toBe(true)
    expect(s1.sessionFiles).toEqual(['savedata1.cg2', 'config.cg2'])
  })

  it('omits config.cg2 from sessionFiles when config is not listed', () => {
    const slots = listSlots(
      listed([{ relativePath: 'savedata0.cg2', bytes: encodeMinimalCampaign() }])
    )
    expect(slots[0]).toMatchObject({
      exists: true,
      readable: true,
      sessionFiles: ['savedata0.cg2']
    })
  })

  it('returns six slots 0..5 with empty entries for missing files', () => {
    const slots = listSlots(listed([]))
    expect(slots).toHaveLength(6)
    expect(slots.map((s) => s.id)).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(slots.every((s) => !s.exists)).toBe(true)
  })
})
