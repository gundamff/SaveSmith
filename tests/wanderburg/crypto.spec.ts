import { describe, expect, it } from 'vitest'
import {
  decryptSaveBytesToUtf8,
  encryptUtf8ToSaveBytes
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

  it('rejects wrong key', () => {
    const fileBytes = encryptUtf8ToSaveBytes('{"a":1}', 'right')
    expect(() => decryptSaveBytesToUtf8(fileBytes, 'wrong')).toThrow()
  })
})
