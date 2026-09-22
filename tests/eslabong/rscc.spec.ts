import { describe, expect, it } from 'vitest'
import { compressRscc, decompressRscc } from '../../src/games/eslabong/rscc'

describe('eslabong rscc', () => {
  it('round-trips plaintext through compress then decompress', async () => {
    const plain = new TextEncoder().encode('Eslabong RSCC fixture ' + 'x'.repeat(9000))
    const packed = await compressRscc(plain, { blockSize: 4096 })
    expect(packed[0]).toBe(0x52) // R
    expect(packed[1]).toBe(0x53) // S
    expect(packed[2]).toBe(0x43) // C
    expect(packed[3]).toBe(0x43) // C
    const again = await decompressRscc(packed)
    expect(Buffer.from(again).equals(Buffer.from(plain))).toBe(true)
  })

  it('rejects bad magic', async () => {
    await expect(decompressRscc(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/RSCC|magic/i)
  })
})
