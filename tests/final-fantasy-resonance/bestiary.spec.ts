import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getInt } from '../../src/games/final-fantasy-resonance/model/gvasIndex'
import { libraScanAll, setBestiaryDefeat } from '../../src/games/final-fantasy-resonance/model/saveModel'
import { parse, serialize } from '../../src/games/final-fantasy-resonance/parse'

describe('ffr bestiary', () => {
  it('projects unitList and libra-scans when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const state = parse([{ relativePath: 'GameSaveData1.sav', bytes: new Uint8Array(readFileSync(path)) }])
    expect(state.bestiary.length).toBeGreaterThan(100)
    const row = state.bestiary.find((b) => b.saveId === 1001) ?? state.bestiary[0]!
    const target = 42
    libraScanAll(state)
    setBestiaryDefeat(state, row.index, target)
    expect(getInt(state.index, state.plain, `unitList[${row.index}].defeatNum`)).toBe(target)
    expect(state.bestiary.every((b) => b.isAnalyzed)).toBe(true)
    const out = serialize(state)
    const again = parse([{ relativePath: out[0]!.relativePath, bytes: out[0]!.bytes }])
    const againRow = again.bestiary.find((b) => b.saveId === row.saveId)!
    expect(againRow.defeatNum).toBe(target)
    expect(again.bestiary.every((b) => b.isAnalyzed)).toBe(true)
  })
})
