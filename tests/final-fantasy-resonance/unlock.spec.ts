import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  applyMaterialPack,
  unlockAllVisions,
  unlockGearAndConsumables
} from '../../src/games/final-fantasy-resonance/actions'
import { catalogLabel } from '../../src/games/final-fantasy-resonance/catalog/names'
import { parse, serialize } from '../../src/games/final-fantasy-resonance/parse'

const PERFECT = 'D:/迅雷下载/最终幻想共鸣存档/GameSaveData1.sav'
const LOCAL = process.env.FFR_SAVE

describe('ffr unlock actions', () => {
  it('merges gear list and roundtrips when a save path is available', () => {
    const path = LOCAL || PERFECT
    try {
      readFileSync(path)
    } catch {
      return
    }
    const state = parse([{ relativePath: 'GameSaveData1.sav', bytes: new Uint8Array(readFileSync(path)) }])
    const before = state.inventory.length
    unlockGearAndConsumables(state)
    expect(state.inventory.length).toBeGreaterThanOrEqual(before)
    expect(state.inventory.length).toBeGreaterThanOrEqual(400)
    applyMaterialPack(state)
    expect(state.inventory.some((r) => r.itemId === 20016 && r.num >= 1)).toBe(true)
    expect(state.inventory.some((r) => r.itemId === 29500)).toBe(true)
    const out = serialize(state)
    const again = parse([{ relativePath: out[0]!.relativePath, bytes: out[0]!.bytes }])
    expect(again.inventory.length).toBe(state.inventory.length)
  })

  it('appends missing visions when a save path is available', () => {
    const path = LOCAL || PERFECT
    try {
      readFileSync(path)
    } catch {
      return
    }
    // Use local early save if present (fewer visions); else perfect already has 26.
    const state = parse([{ relativePath: 'x.sav', bytes: new Uint8Array(readFileSync(path)) }])
    const before = state.visions.length
    if (before === 0) return
    unlockAllVisions(state)
    expect(state.visions.length).toBeGreaterThanOrEqual(before)
    expect(state.visions.length).toBe(26)
    expect(state.visions.some((v) => v.id === 13113)).toBe(true)
    const out = serialize(state)
    const again = parse([{ relativePath: 'y.sav', bytes: out[0]!.bytes }])
    expect(again.visions.length).toBe(26)
  })
})

describe('ffr zh names from game ST', () => {
  it('shows Simplified Chinese for potion / rain / tablet shard', () => {
    expect(catalogLabel('item', 1, 'zh', false)).toBe('恢复药')
    expect(catalogLabel('unit', 1001, 'zh', false)).toBe('雷因')
    expect(catalogLabel('item', 25004, 'zh', false)).toBe('石板碎片')
  })
})
