import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addOrSetInventoryItem } from '../../src/games/final-fantasy-resonance/actions'
import { finalFantasyResonanceModule } from '../../src/games/final-fantasy-resonance'
import { setCurrentMoney } from '../../src/games/final-fantasy-resonance/model/saveModel'
import { parse, serialize, validate } from '../../src/games/final-fantasy-resonance/parse'
import { modules } from '../../src/host/registry'

describe('ffr module', () => {
  it('is registered', () => {
    expect(modules.some((m) => m.id === 'final-fantasy-resonance')).toBe(true)
    expect(finalFantasyResonanceModule.locate.windowsPathTemplates[0]).toContain('FFRS\\Steam\\*')
  })

  it('roundtrips money edit when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const bytes = new Uint8Array(readFileSync(path))
    const state = parse([{ relativePath: 'GameSaveData1.sav', bytes }])
    const before = state.currentMoney
    setCurrentMoney(state, before + 7)
    expect(validate(state)).toEqual([])
    const out = serialize(state)
    expect(out).toHaveLength(1)
    const again = parse([{ relativePath: out[0]!.relativePath, bytes: out[0]!.bytes }])
    expect(again.currentMoney).toBe(before + 7)
  })

  it('adds inventory item when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const bytes = new Uint8Array(readFileSync(path))
    const state = parse([{ relativePath: 'GameSaveData1.sav', bytes }])
    const before = state.inventory.length
    addOrSetInventoryItem(state, 999001, 3)
    expect(state.inventory.some((r) => r.itemId === 999001 && r.num === 3)).toBe(true)
    expect(state.inventory.length).toBeGreaterThanOrEqual(before)
    const out = serialize(state)
    const again = parse([{ relativePath: out[0]!.relativePath, bytes: out[0]!.bytes }])
    expect(again.inventory.some((r) => r.itemId === 999001 && r.num === 3)).toBe(true)
  })
})
