import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { utf8Encode } from '../../src/sdk/session'
import { parse, serialize, validate } from '../../src/games/belmonts-curse/parse'
import { setPlayerScalar } from '../../src/games/belmonts-curse/model/saveModel'

const fix = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/minimal-buildsave.json')
const bytes = utf8Encode(readFileSync(fix, 'utf8'))

describe('belmonts-curse parse', () => {
  it('round-trips scalars and preserves opaque keys', () => {
    const state = parse([{ relativePath: 'BuildSave_0.sav', bytes }])
    expect(state.player.level).toBe(3)
    expect(state.player.itemsInInventory).toEqual([
      'WeaponFistTier1',
      'BoomerangCross',
      'Skin_MC_Base',
      'Charm_ChestRecover'
    ])
    expect(state.exploration.entityCount).toBe(1)
    expect(state.exploration.completionItemCount).toBe(2)
    setPlayerScalar(state, 'experienceCurrent', 11)
    expect(validate(state)).toEqual([])
    const out = serialize(state)
    const again = parse(out)
    expect(again.player.experienceCurrent).toBe(11)
    expect(again.player.level).toBe(3)
    const root = JSON.parse(new TextDecoder().decode(out[0]!.bytes)) as Record<string, unknown>
    expect(root.extraRootKey).toBe(42)
    expect((root.playerSave as Record<string, unknown>).unknownFutureField).toEqual({ keep: true })
  })

  it('rejects negative level via validate', () => {
    const state = parse([{ relativePath: 'BuildSave_0.sav', bytes: new Uint8Array(bytes) }])
    setPlayerScalar(state, 'level', 0)
    expect(validate(state).some((i) => i.code === 'BC_LEVEL')).toBe(true)
  })
})
