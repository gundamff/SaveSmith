import { describe, expect, it } from 'vitest'
import { resolveStoreUrl, steamStoreUrl } from '@sdk/steam'
import { dummyModule } from './dummyModule'

describe('steamStoreUrl', () => {
  it('prefers steamAppId over storeUrl', () => {
    expect(steamStoreUrl(2770330)).toBe('https://store.steampowered.com/app/2770330')
    expect(resolveStoreUrl({ steamAppId: 2770330, storeUrl: 'https://example.com' })).toBe(
      'https://store.steampowered.com/app/2770330'
    )
    expect(resolveStoreUrl({})).toBeNull()
  })
})

describe('dummy GameModule contract', () => {
  const files = {
    dir: 'X:\\saves',
    files: [{ relativePath: 'save.txt', bytes: new TextEncoder().encode('10') }]
  }

  it('lists a readable slot and fill action mutates state', () => {
    const slots = dummyModule.listSlots(files)
    expect(slots[0]).toMatchObject({ id: 'slot-0', readable: true, sessionFiles: ['save.txt'] })
    let state = dummyModule.parse([{ relativePath: 'save.txt', bytes: files.files[0].bytes! }])
    expect(state.gold).toBe(10)
    expect(dummyModule.actions(state)[0].id).toBe('fill')
    state = dummyModule.applyAction(state, 'fill')
    expect(state.gold).toBe(999)
    expect(dummyModule.validate(state)).toEqual([])
    const out = dummyModule.serialize(state)
    expect(new TextDecoder().decode(out[0].bytes)).toBe('999')
  })

  it('validate blocks negative gold', () => {
    const state = { gold: -1 }
    expect(dummyModule.validate(state)[0].code).toBe('NEGATIVE_GOLD')
  })
})
