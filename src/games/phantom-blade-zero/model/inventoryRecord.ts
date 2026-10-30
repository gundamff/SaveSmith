import type { PbzCatalogItem } from '../catalog'

const PBZ_TIME =
  /^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2})$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    return leap ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function isPbzTime(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = PBZ_TIME.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  )
}

export function formatPbzTime(now: Date): string {
  const year = now.getFullYear()
  if (Number.isNaN(now.getTime()) || year < 0 || year > 9999) {
    throw new RangeError('PBZ timestamp requires a local year from 0000 through 9999')
  }
  return [
    `${String(year).padStart(4, '0')}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`,
    `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`
  ].join('-')
}

export function createInventoryRecord(
  item: PbzCatalogItem,
  amount: number,
  now: Date,
  acquiredCycle: number
): Record<string, unknown> {
  const stamp = formatPbzTime(now)
  return {
    CurrentAmount: amount,
    MaxAmount: item.category === 'weapon-material' ? amount : item.maxAmount,
    FirstAddTime: stamp,
    DirtyTime: stamp,
    AcquiredCycle: acquiredCycle
  }
}
