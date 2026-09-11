import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { decryptPlr, encryptPlr } from '../../src/games/terraria/crypto/plrAes'

const SAMPLE = path.resolve(__dirname, '../fixtures/terraria/sample.plr')

describe('plrAes', () => {
  it('decrypts sample.plr to FileMetadata header', () => {
    const enc = new Uint8Array(fs.readFileSync(SAMPLE))
    const plain = decryptPlr(enc)
    expect(plain.length % 16).toBe(0)
    const version = plain[0]! | (plain[1]! << 8) | (plain[2]! << 16) | (plain[3]! << 24)
    expect(version).toBeGreaterThanOrEqual(230)
    const magic = String.fromCharCode(...plain.slice(4, 11))
    expect(magic).toBe('relogic')
  })

  it('round-trips ciphertext through decrypt → encrypt → decrypt', () => {
    const enc = new Uint8Array(fs.readFileSync(SAMPLE))
    const plain = decryptPlr(enc)
    const again = decryptPlr(encryptPlr(plain))
    expect(again).toEqual(plain)
  })
})
