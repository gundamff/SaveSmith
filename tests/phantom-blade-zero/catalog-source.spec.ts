import { describe, expect, it } from 'vitest'
import items from '../../src/games/phantom-blade-zero/catalog/items.json'

describe('phantom-blade-zero item catalog', () => {
  it('ships only complete supported PBZ catalog rows', () => {
    expect(items.length).toBeGreaterThan(0)
    expect(new Set(items.map(({ id }) => id)).size).toBe(items.length)
    for (const row of items) {
      expect(row.id).toMatch(/^[A-Za-z0-9_]+$/)
      expect(['weapon-material', 'consumable']).toContain(row.category)
      expect(row.zh || row.en).toBeTruthy()
      expect(Number.isSafeInteger(row.maxAmount)).toBe(true)
      expect(row.maxAmount).toBeGreaterThan(0)
    }
  })

  it('does not expose known threshold collectibles', () => {
    const text = JSON.stringify(items)
    expect(text).not.toMatch(/记忆之花|黑石碎片|杀气琥珀/)
  })
})
