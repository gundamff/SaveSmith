import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decryptSvhd } from '../../src/games/final-fantasy-resonance/crypto/svhd'
import {
  getInt,
  parseGvasIndex,
  setInt,
  padAes
} from '../../src/games/final-fantasy-resonance/model/gvasIndex'

describe('ffr gvasIndex', () => {
  it('parses real save paths when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const raw = new Uint8Array(readFileSync(path))
    const { plain } = decryptSvhd(raw)
    const index = parseGvasIndex(plain)
    expect(index.end).toBeGreaterThan(1000)
    expect(index.fields.has('currentMoney') || index.fields.has('Player.currentMoney')).toBe(true)
    expect(index.arrays.has('inventory') || index.arrays.has('Player.inventory')).toBe(true)
  })

  it('get/set currentMoney in place when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const raw = new Uint8Array(readFileSync(path))
    const { plain } = decryptSvhd(raw)
    const index = parseGvasIndex(plain)
    const moneyPath = index.fields.has('currentMoney') ? 'currentMoney' : 'Player.currentMoney'
    const before = getInt(index, plain, moneyPath)
    const copy = new Uint8Array(plain)
    setInt(copy, index, moneyPath, before + 1)
    const index2 = parseGvasIndex(copy)
    expect(getInt(index2, copy, moneyPath)).toBe(before + 1)
    const padded = padAes(copy, index2.end)
    expect(padded.length % 16).toBe(0)
  })
})
