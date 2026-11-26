import { describe, expect, it } from 'vitest'
import { decryptSaveDat, encryptSaveDat } from '../../src/games/re2-i-rise-alone/crypto/aesEcb'

describe('re2ira aesEcb', () => {
  it('round-trips utf8 json', () => {
    const plain = new TextEncoder().encode('{"a":"1"}')
    const cipher = encryptSaveDat(plain)
    expect(cipher.byteLength % 16).toBe(0)
    expect(new TextDecoder().decode(decryptSaveDat(cipher))).toBe('{"a":"1"}')
  })

  it('rejects empty cipher', () => {
    expect(() => decryptSaveDat(new Uint8Array())).toThrow()
  })
})