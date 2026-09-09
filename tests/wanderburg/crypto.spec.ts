import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MM_KEY } from '../../src/games/wanderburg/crypto/keys'
import {
  decryptSaveBytesToUtf8,
  encryptUtf8ToSaveBytes,
  pkcs7Pad,
  pkcs7Unpad
} from '../../src/games/wanderburg/crypto/mmJsonEncrypted'

describe('mmJsonEncrypted', () => {
  it('round-trips JSON text', () => {
    const key = 'unit-test-key'
    const plain = '{"hello":1,"unlockedIDs":[1,2]}'
    const fileBytes = encryptUtf8ToSaveBytes(plain, key)
    const text = new TextDecoder().decode(fileBytes)
    expect(text).toMatch(/^[A-Za-z0-9+/=\r\n]+$/)
    expect(decryptSaveBytesToUtf8(fileBytes, key)).toBe(plain)
  })

  it('encrypt uses PKCS7 (not zero-pad) so .NET-style decrypt can succeed', () => {
    const plain = new TextEncoder().encode('{"silver":1}')
    const padded = pkcs7Pad(plain, 32)
    expect(padded.length % 32).toBe(0)
    expect(padded[padded.length - 1]).toBe(padded.length - plain.length)
    expect(pkcs7Unpad(padded, 32)).toEqual(plain)

    const fileBytes = encryptUtf8ToSaveBytes('{"silver":1}', 'k')
    // ciphertext payload after salt+iv must be block-aligned; last plaintext block ends with PKCS7
    expect(decryptSaveBytesToUtf8(fileBytes, 'k')).toBe('{"silver":1}')
  })

  it('rejects wrong key', () => {
    const fileBytes = encryptUtf8ToSaveBytes('{"a":1}', 'right')
    expect(() => decryptSaveBytesToUtf8(fileBytes, 'wrong')).toThrow()
  })

  it('works without Node Buffer (WebView path)', () => {
    const saved = globalThis.Buffer
    // @ts-expect-error intentional delete for browser simulation
    delete globalThis.Buffer
    try {
      expect(typeof globalThis.Buffer).toBe('undefined')
      const plain = '{"silver":42}'
      const fileBytes = encryptUtf8ToSaveBytes(plain, 'k')
      expect(decryptSaveBytesToUtf8(fileBytes, 'k')).toBe(plain)
    } finally {
      globalThis.Buffer = saved
    }
  })
})

const savePath = process.env.WANDERBURG_SAVE
describe.runIf(!!savePath)('real save', () => {
  it('decrypts and re-encrypts', () => {
    const bytes = new Uint8Array(fs.readFileSync(savePath as string))
    const plain = decryptSaveBytesToUtf8(bytes, MM_KEY)
    const again = encryptUtf8ToSaveBytes(plain, MM_KEY)
    expect(decryptSaveBytesToUtf8(again, MM_KEY)).toBe(plain)
  })
})
