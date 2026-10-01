import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/dead-cells/slots'

describe('dead-cells listSlots', () => {
  it('maps user_N.dat files to slots sorted numerically', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        { relativePath: 'user_10.dat', bytes: new Uint8Array([1]) },
        { relativePath: 'user_0.dat', bytes: new Uint8Array([1]) },
        { relativePath: 'user_2.dat', bytes: new Uint8Array([1]) },
        { relativePath: 'dc_options.json', bytes: new Uint8Array([1]) }
      ]
    })
    expect(slots.map((s) => s.id)).toEqual(['user-0', 'user-2', 'user-10'])
    expect(slots[0]).toMatchObject({
      id: 'user-0',
      exists: true,
      readable: true,
      title: 'user_0.dat',
      sessionFiles: ['user_0.dat']
    })
  })

  it('marks missing bytes unreadable and ignores other files', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        { relativePath: 'save\\user_1.dat', bytes: null },
        { relativePath: 'steam_cloud.dat', bytes: new Uint8Array([1]) }
      ]
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      id: 'user-1',
      readable: false,
      sessionFiles: ['save\\user_1.dat']
    })
  })
})
