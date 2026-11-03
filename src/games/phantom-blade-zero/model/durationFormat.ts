export interface HmsParts {
  hours: number
  minutes: number
  seconds: number
}

export const MAX_DURATION_SECONDS = 3_599_999

export function isValidDurationSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_DURATION_SECONDS
}

export function totalSecondsToHms(totalSeconds: number): HmsParts {
  if (!isValidDurationSeconds(totalSeconds)) {
    throw new RangeError('invalid duration seconds')
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { hours, minutes, seconds }
}

export function hmsToTotalSeconds(parts: HmsParts): number {
  const { hours, minutes, seconds } = parts
  if (
    !Number.isSafeInteger(hours) ||
    !Number.isSafeInteger(minutes) ||
    !Number.isSafeInteger(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new RangeError('invalid HMS parts')
  }
  const total = hours * 3600 + minutes * 60 + seconds
  if (!isValidDurationSeconds(total)) throw new RangeError('invalid duration seconds')
  return total
}
