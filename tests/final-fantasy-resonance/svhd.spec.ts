import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decryptSvhd, encryptSvhd } from '../../src/games/final-fantasy-resonance/crypto/svhd'

describe('ffr svhd', () => {
  it('rejects non-SVHD', () => {
    expect(() => decryptSvhd(new Uint8Array(64))).toThrow()
  })

  it('rejects truncated header', () => {
    const raw = new Uint8Array(16)
    raw[0] = 0x53
    raw[1] = 0x56
    raw[2] = 0x48
    raw[3] = 0x44
    expect(() => decryptSvhd(raw)).toThrow()
  })

  it('roundtrips synthetic AES block', () => {
    const plain = new Uint8Array(32)
    plain[0] = 0x47
    plain[1] = 0x56
    plain[2] = 0x41
    plain[3] = 0x53
    const header = new Uint8Array(32)
    header[0] = 0x53
    header[1] = 0x56
    header[2] = 0x48
    header[3] = 0x44
    header[4] = 1
    header[6] = 1
    const enc = encryptSvhd(header, plain)
    expect(enc.length).toBe(64)
    expect(String.fromCharCode(enc[0]!, enc[1]!, enc[2]!, enc[3]!)).toBe('SVHD')
    const { plain: out } = decryptSvhd(enc)
    expect(Array.from(out)).toEqual(Array.from(plain))
  })

  it('decrypts real GameSaveData when FFR_SAVE is set', () => {
    const path = process.env.FFR_SAVE
    if (!path) return
    const raw = new Uint8Array(readFileSync(path))
    const { plain } = decryptSvhd(raw)
    expect(String.fromCharCode(plain[0]!, plain[1]!, plain[2]!, plain[3]!)).toBe('GVAS')
    const again = encryptSvhd(raw.subarray(0, 32), plain)
    const { plain: plain2 } = decryptSvhd(again)
    expect(Array.from(plain2)).toEqual(Array.from(plain))
  })
})
