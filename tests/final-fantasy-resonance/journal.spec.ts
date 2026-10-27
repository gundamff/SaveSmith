import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  resetAllTreasureChests,
  restockAllShops,
  setColosseumClear
} from '../../src/games/final-fantasy-resonance/model/saveModel'
import { parse, serialize } from '../../src/games/final-fantasy-resonance/parse'

describe('ffr journal/shops/chests', () => {
  it('projects quests/requests/shops and restocks when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const state = parse([{ relativePath: 'GameSaveData1.sav', bytes: new Uint8Array(readFileSync(path)) }])
    expect(state.progressFlagCount).toBeGreaterThan(0)
    expect(state.quests.length).toBeGreaterThan(0)
    expect(state.hasArtifactList).toBe(false)
    if (state.colosseum[0]) {
      const before = state.colosseum[0].clearCount
      setColosseumClear(state, state.colosseum[0].index, before + 1)
    }
    for (const s of state.shops) {
      if (s.currentBuyNum > 0) break
    }
    restockAllShops(state)
    expect(state.shops.every((s) => s.currentBuyNum === 0)).toBe(true)
    resetAllTreasureChests(state)
    const openLeft = [...state.index.boolRefs.keys()].filter(
      (k) => k.includes('treasureBoxList') && k.endsWith('.IsOpen') && state.index.bools.get(k)
    )
    expect(openLeft).toEqual([])
    const out = serialize(state)
    expect(out[0]!.bytes.length).toBeGreaterThan(32)
  })
})
