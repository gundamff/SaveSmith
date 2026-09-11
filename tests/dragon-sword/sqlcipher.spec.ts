import { describe, expect, it } from 'vitest'
import { decryptSqlCipher, encryptSqlCipher, readSalt, SQLCIPHER_PASSPHRASE } from '../../src/games/dragon-sword/crypto/sqlcipher'

describe('sqlcipher', () => {
  it('round-trips a page-aligned buffer and preserves salt', () => {
    const salt = new Uint8Array(16)
    salt[0] = 0x42
    // plaintext: PAGE_SIZE bytes, first 16 = SQLite magic (tests may use zeros except magic)
    const plain = new Uint8Array(4096)
    plain.set(new TextEncoder().encode('SQLite format 3\0'), 0)
    plain[100] = 7
    const enc = encryptSqlCipher(plain, salt, SQLCIPHER_PASSPHRASE)
    expect(enc.length).toBe(4096)
    expect([...readSalt(enc)]).toEqual([...salt])
    const dec = decryptSqlCipher(enc, SQLCIPHER_PASSPHRASE)
    expect(dec[100]).toBe(7)
    expect(new TextDecoder().decode(dec.slice(0, 15))).toBe('SQLite format 3')
  })

  it('rejects HMAC mismatch', () => {
    const salt = new Uint8Array(16)
    const plain = new Uint8Array(4096)
    plain.set(new TextEncoder().encode('SQLite format 3\0'), 0)
    const enc = encryptSqlCipher(plain, salt)
    enc[enc.length - 1] ^= 0xff
    expect(() => decryptSqlCipher(enc)).toThrow(/HMAC|sqlcipher/i)
  })
})
