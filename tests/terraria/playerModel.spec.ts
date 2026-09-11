import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { decryptPlr } from '../../src/games/terraria/crypto/plrAes'
import {
  applyMoney,
  moneyFromState,
  parsePlayer,
  serializePlayer
} from '../../src/games/terraria/model/playerModel'

const SAMPLE = path.resolve(__dirname, '../fixtures/terraria/sample.plr')

function samplePlain(): Uint8Array {
  return decryptPlr(new Uint8Array(fs.readFileSync(SAMPLE)))
}

describe('playerModel', () => {
  it('parses name, stats, and first armor from sample', () => {
    const state = parsePlayer(samplePlain(), 'Players/sample.plr')
    expect(state.version).toBe(326)
    expect(state.name).toBe('[皮皮')
    expect(state.statLife).toBe(292)
    expect(state.statLifeMax).toBe(500)
    expect(state.statMana).toBe(200)
    expect(state.statManaMax).toBe(200)
    expect(state.armor[0]?.id).toBe(559)
    expect(state.inventory.length).toBe(50)
    expect(state.coins.length).toBe(4)
    expect(state.ammo.length).toBe(4)
  })

  it('serialize(parse(x)) is byte-identical', () => {
    const plain = samplePlain()
    const state = parsePlayer(plain, 'Players/sample.plr')
    expect(serializePlayer(state)).toEqual(plain)
  })

  it('edits life and an inventory stack then round-trips', () => {
    const state = parsePlayer(samplePlain(), 'Players/sample.plr')
    state.statLife = 400
    state.statLifeMax = 400
    const slot = state.inventory.find((s) => s.id !== 0) ?? state.inventory[0]!
    slot.id = 71
    slot.stack = 99
    slot.prefix = 0
    slot.favorited = false
    const again = parsePlayer(serializePlayer(state), state.relativePath)
    expect(again.statLife).toBe(400)
    expect(again.statLifeMax).toBe(400)
    expect(again.inventory.some((s) => s.id === 71 && s.stack === 99)).toBe(true)
    expect(again.name).toBe(state.name)
  })

  it('applyMoney writes copper–platinum into coin slots', () => {
    const state = parsePlayer(samplePlain(), 'Players/sample.plr')
    applyMoney(state, { platinum: 1, gold: 2, silver: 3, copper: 4 })
    expect(moneyFromState(state)).toEqual({ platinum: 1, gold: 2, silver: 3, copper: 4 })
    expect(state.coins[0]?.id).toBe(71)
    expect(state.coins[0]?.stack).toBe(4)
    expect(state.coins[3]?.id).toBe(74)
    expect(state.coins[3]?.stack).toBe(1)
  })
})
