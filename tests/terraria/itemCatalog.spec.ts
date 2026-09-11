import { describe, expect, it } from 'vitest'
import { getItemRow, searchItems } from '../../src/games/terraria/model/itemCatalog'

describe('itemCatalog', () => {
  it('has bilingual names for common ids', () => {
    expect(getItemRow(8)?.name.zh).toBe('火把')
    expect(getItemRow(8)?.name.en).toBe('Torch')
    expect(getItemRow(71)?.name.zh).toContain('铜')
    expect(getItemRow(4956)?.name.en).toBe('Zenith')
  })

  it('searches by chinese name', () => {
    const hits = searchItems('天顶')
    expect(hits.some((x) => x.id === 4956)).toBe(true)
  })
})
