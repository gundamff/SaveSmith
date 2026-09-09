import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MM_KEY } from '../../src/games/wanderburg/crypto/keys'
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

const savePath = process.env.WANDERBURG_SAVE
describe.runIf(!!savePath)('real save', () => {
  it('decrypts and re-encrypts', () => {
    const bytes = new Uint8Array(fs.readFileSync(savePath as string))
    const plain = decryptSaveBytesToUtf8(bytes, MM_KEY)
    const again = encryptUtf8ToSaveBytes(plain, MM_KEY)
    expect(decryptSaveBytesToUtf8(again, MM_KEY)).toBe(plain)
  })
})
