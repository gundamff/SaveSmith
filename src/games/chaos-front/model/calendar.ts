/** 委员会历：每年 12 月 × 每月 30 日 = 360 日；1 年 1 月 1 日 = PlayerDay 1 */

export interface HistoryYmd {
  year: number
  month: number
  day: number
}

export function playerDayFromYmd(year: number, month: number, day: number): number {
  return (year - 1) * 360 + (month - 1) * 30 + day
}

export function ymdFromPlayerDay(playerDay: number): HistoryYmd {
  const d = Math.max(1, Math.round(playerDay))
  const year = Math.floor((d - 1) / 360) + 1
  const rem = (d - 1) % 360
  const month = Math.floor(rem / 30) + 1
  const day = (rem % 30) + 1
  return { year, month, day }
}

/** 存档 HistoryTime 固定为游戏中文格式 */
export function formatHistoryTime(year: number, month: number, day: number): string {
  return `委员会历${year}年${month}月${day}日`
}
