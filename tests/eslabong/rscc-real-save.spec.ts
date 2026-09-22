import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compressRscc, decompressRscc } from '../../src/games/eslabong/rscc'

const src = process.env.ESLABONG_RES
describe.skipIf(!src || !existsSync(src!))('eslabong RSCC real save', () => {
  it('decompress then recompress yields decompressible plaintext of same length', async () => {
    const packed = new Uint8Array(readFileSync(src!))
    const plain = await decompressRscc(packed)
    expect(plain.length).toBeGreaterThan(1_000_000)
    const again = await compressRscc(plain, { blockSize: 4096 })
    const plain2 = await decompressRscc(again)
    expect(plain2.length).toBe(plain.length)
    expect(Buffer.from(plain2).equals(Buffer.from(plain))).toBe(true)
    const out = join(tmpdir(), 'eslabong-rscc-roundtrip.res')
    writeFileSync(out, again)
    // Manual gate: copy over campaign_save_N.res backup and load in game.
    expect(out.length).toBeGreaterThan(0)
  })
})
