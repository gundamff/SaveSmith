import type { PbzCatalogItem } from '../catalog'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatPbzTime(now: Date): string {
  return [
    `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`,
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
