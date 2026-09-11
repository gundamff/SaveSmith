import { describe, expect, it } from 'vitest'
import { terrariaModule } from '../../src/games/terraria'

describe('terraria views', () => {
  it('exposes character and inventory tabs', () => {
    expect(terrariaModule.views.map((v) => v.id)).toEqual(['character', 'inventory'])
    expect(terrariaModule.views.every((v) => typeof v.component === 'object' || typeof v.component === 'function')).toBe(
      true
    )
  })
})
