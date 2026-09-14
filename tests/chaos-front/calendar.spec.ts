import { describe, expect, it } from 'vitest'
import {
  formatHistoryTime,
  playerDayFromYmd,
  ymdFromPlayerDay
} from '../../src/games/chaos-front/model/calendar'

describe('chaos-front calendar', () => {
  it('maps fixture 委员会历28年2月24日 ↔ PlayerDay 9774', () => {
    expect(playerDayFromYmd(28, 2, 24)).toBe(9774)
    expect(ymdFromPlayerDay(9774)).toEqual({ year: 28, month: 2, day: 24 })
    expect(formatHistoryTime(28, 2, 24)).toBe('委员会历28年2月24日')
  })

  it('maps 委员会历26年12月7日 ↔ PlayerDay 9337', () => {
    expect(playerDayFromYmd(26, 12, 7)).toBe(9337)
    expect(ymdFromPlayerDay(9337)).toEqual({ year: 26, month: 12, day: 7 })
  })

  it('round-trips day 1 as 1年1月1日', () => {
    expect(playerDayFromYmd(1, 1, 1)).toBe(1)
    expect(ymdFromPlayerDay(1)).toEqual({ year: 1, month: 1, day: 1 })
  })
})
