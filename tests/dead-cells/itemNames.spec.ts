import { describe, expect, it } from 'vitest'
import { hasItemName, itemDisplayName } from '../../src/games/dead-cells/model/itemNames'

describe('dead-cells item names', () => {
  it('maps known ids to localized names', () => {
    expect(itemDisplayName('StandardTurret', 'zh')).toBe('圆斩箭塔')
    expect(itemDisplayName('StandardTurret', 'en')).toBe('Sinew Slicer')
    expect(itemDisplayName('QuickSword', 'zh')).toBe('均衡之刃')
    expect(itemDisplayName('IceBomb', 'zh')).toBe('冰冻手雷')
  })

  it('falls back to the raw id for unknown ids', () => {
    expect(itemDisplayName('NoSuchItemXyz', 'zh')).toBe('NoSuchItemXyz')
    expect(itemDisplayName('NoSuchItemXyz', 'en')).toBe('NoSuchItemXyz')
    expect(hasItemName('NoSuchItemXyz')).toBe(false)
    expect(hasItemName('StandardTurret')).toBe(true)
  })
})
