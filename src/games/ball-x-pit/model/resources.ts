import { ModuleError } from '@sdk/error'
import {
  findIntArrayNearField,
  findUniqueField,
  readI32,
  writeI32
} from './binary'

export interface TownResources {
  money: number
  rice: number
  wood: number
  stone: number
}

export type ResourceLayout = 'count4' | 'count5'

export interface ResourceLoc {
  layout: ResourceLayout
  /** offsets of money, rice, wood, stone */
  offsets: { money: number; rice: number; wood: number; stone: number }
}

const MAX = 0x7fffffff

/**
 * Search only between NumResources and TotalResources so the lifetime array
 * is not mistaken for current balances (they sit <192 bytes apart on real saves).
 */
function resourceSearchWindow(data: Uint8Array, fieldAt: number): number {
  try {
    const totalAt = findUniqueField(data, 'TotalResources')
    if (totalAt > fieldAt) return Math.max(24, totalAt - fieldAt)
  } catch {
    /* fall through */
  }
  return 192
}

export function locateNumResources(data: Uint8Array): ResourceLoc {
  const fieldAt = findUniqueField(data, 'NumResources')
  const window = resourceSearchWindow(data, fieldAt)
  // Prefer count=5 (stone inside), else count=4 (stone after).
  try {
    const arr = findIntArrayNearField(data, fieldAt, 'NumResources', window, {
      requireMarker4: true,
      expectedCount: 5
    })
    return {
      layout: 'count5',
      offsets: {
        money: arr.valuesOffset + 4,
        rice: arr.valuesOffset + 8,
        wood: arr.valuesOffset + 12,
        stone: arr.valuesOffset + 16
      }
    }
  } catch {
    /* try count4 */
  }
  const arr4 = findIntArrayNearField(data, fieldAt, 'NumResources', window, {
    requireMarker4: true,
    expectedCount: 4
  })
  // values: [marker, money, rice, wood]; stone immediately after array
  const stoneOff = arr4.valuesOffset + 4 * 4
  if (stoneOff + 4 > data.length) throw new ModuleError('BXP_TRUNCATED', [stoneOff])
  return {
    layout: 'count4',
    offsets: {
      money: arr4.valuesOffset + 4,
      rice: arr4.valuesOffset + 8,
      wood: arr4.valuesOffset + 12,
      stone: stoneOff
    }
  }
}

export function readResources(data: Uint8Array): TownResources {
  const loc = locateNumResources(data)
  return {
    money: readI32(data, loc.offsets.money),
    rice: readI32(data, loc.offsets.rice),
    wood: readI32(data, loc.offsets.wood),
    stone: readI32(data, loc.offsets.stone)
  }
}

function clampResource(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX) {
    throw new ModuleError('BXP_RESOURCE_RANGE', [name, value])
  }
  return value
}

/** Mutates `data` in place. Only touches NumResources (not TotalResources). */
export function writeResources(data: Uint8Array, next: TownResources): void {
  const loc = locateNumResources(data)
  writeI32(data, loc.offsets.money, clampResource('money', next.money))
  writeI32(data, loc.offsets.rice, clampResource('rice', next.rice))
  writeI32(data, loc.offsets.wood, clampResource('wood', next.wood))
  writeI32(data, loc.offsets.stone, clampResource('stone', next.stone))
}
