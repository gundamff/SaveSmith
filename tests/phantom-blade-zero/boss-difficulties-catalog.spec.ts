import { describe, expect, it } from 'vitest'
import {
  getPbzBossDifficulty,
  listPbzBossDifficulties,
  pbzBossDifficultyName,
} from '@games/phantom-blade-zero/catalog/bossDifficulties'

describe('PBZ boss difficulties catalog', () => {
  it('loads at least the keys seen in live saves and sorts by order', () => {
    const list = listPbzBossDifficulties()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(getPbzBossDifficulty('0_2')).toBeTruthy()
    expect(getPbzBossDifficulty('0_3')).toBeTruthy()
    const orders = list.map((row) => row.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('names unknown keys as the raw key', () => {
    expect(pbzBossDifficultyName('nope_99', 'zh')).toBe('nope_99')
  })
})
