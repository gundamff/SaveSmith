import { describe, expect, it } from 'vitest'
import {
  MAX_DURATION_SECONDS,
  hmsToTotalSeconds,
  isValidDurationSeconds,
  totalSecondsToHms
} from '../../src/games/phantom-blade-zero/model/durationFormat'

describe('pbz durationFormat', () => {
  it('round-trips HMS and rejects invalid parts/totals', () => {
    expect(totalSecondsToHms(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 })
    expect(hmsToTotalSeconds({ hours: 1, minutes: 1, seconds: 1 })).toBe(3661)
    expect(totalSecondsToHms(141636)).toEqual({ hours: 39, minutes: 20, seconds: 36 })
    expect(isValidDurationSeconds(0)).toBe(true)
    expect(isValidDurationSeconds(MAX_DURATION_SECONDS)).toBe(true)
    expect(isValidDurationSeconds(MAX_DURATION_SECONDS + 1)).toBe(false)
    expect(isValidDurationSeconds(-1)).toBe(false)
    expect(isValidDurationSeconds(1.5)).toBe(false)
  })
})
