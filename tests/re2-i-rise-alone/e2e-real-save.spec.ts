/**
 * Optional real-save gate. Set RE2IRA_SAVE to a SaveData.dat path (copy preferred).
 * Never commits player saves into the repo.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { listSlotMetas, openBagFromCipher } from '../../src/games/re2-i-rise-alone/model/bag'
import { parse, serialize } from '../../src/games/re2-i-rise-alone/parse'

const path = process.env.RE2IRA_SAVE

describe.skipIf(!path)('re2ira real save (RE2IRA_SAVE)', () => {
  it('zero-edit round-trip', () => {
    const bytes = new Uint8Array(readFileSync(path!))
    const { bag } = openBagFromCipher(bytes)
    const metas = listSlotMetas(bag)
    expect(metas.length).toBeGreaterThan(0)
    const slotId = metas[0]!.id

    const state = parse([{ relativePath: 'SaveData.dat', bytes }], { slotId })
    const out = serialize(state)
    expect(out).toHaveLength(1)
    expect(out[0]!.bytes).toEqual(bytes)
  })
})