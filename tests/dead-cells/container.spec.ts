import { describe, expect, it } from 'vitest'
import {
  buildContainer,
  DcFormatError,
  getChunk,
  HEADER_SIZE,
  parseContainer,
  replaceChunk,
  verifyChecksum,
  type DcContainer
} from '../../src/games/dead-cells/model/container'

function makeContainer(): DcContainer {
  return {
    header: {
      magic: new Uint8Array([0xde, 0xad, 0xce, 0x11]),
      version: 1,
      sha1: new Uint8Array(20),
      githash: new Uint8Array(Array.from({ length: 20 }, (_, i) => i + 1)),
      buildDate: new TextEncoder().encode('2026-06-16'),
      flags: 0x040
    },
    chunks: [
      { bit: 0x001, name: 'S_User', data: new Uint8Array([1, 2, 3, 4, 5]) },
      { bit: 0x008, name: 'S_Date', data: new Uint8Array(8).fill(7) },
      { bit: 0x080, name: 'S_VersionNumber', data: new Uint8Array([0, 0, 0x2c, 0x42]) }
    ]
  }
}

describe('dead-cells container', () => {
  it('round-trips header fields and chunks', async () => {
    const raw = await buildContainer(makeContainer())
    expect(raw.length).toBeGreaterThan(HEADER_SIZE)
    const parsed = await parseContainer(raw)
    expect(parsed.header.version).toBe(1)
    expect(parsed.header.buildDate).toEqual(new TextEncoder().encode('2026-06-16'))
    expect(parsed.header.githash[0]).toBe(1)
    expect(parsed.header.flags & 0x040).toBe(0x040)
    expect(parsed.chunks.map((c) => c.name)).toEqual([
      'S_User',
      'S_Date',
      'S_VersionNumber'
    ])
    expect(getChunk(parsed, 'S_User')!.data).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
  })

  it('recomputes a valid checksum on build and keeps feature flags', async () => {
    const raw = await buildContainer(makeContainer())
    await expect(verifyChecksum(raw)).resolves.toBe(true)
    const parsed = await parseContainer(raw)
    // feature bit S_HaveLore preserved even though it carries no chunk
    expect(parsed.header.flags & 0x040).toBe(0x040)
    // chunk bits rebuilt from present chunks
    expect(parsed.header.flags & 0x001).toBe(0x001)
    expect(parsed.header.flags & 0x002).toBe(0)
  })

  it('rejects tampered files via SHA-1 mismatch', async () => {
    const raw = await buildContainer(makeContainer())
    raw[raw.length - 1] ^= 0xff
    await expect(verifyChecksum(raw)).resolves.toBe(false)
    await expect(parseContainer(raw)).rejects.toThrow(DcFormatError)
  })

  it('rejects wrong magic', async () => {
    const raw = await buildContainer(makeContainer())
    raw[0] = 0x00
    await expect(parseContainer(raw)).rejects.toThrow(/magic/)
  })

  it('rejects truncated file', async () => {
    await expect(parseContainer(new Uint8Array(10))).rejects.toThrow(DcFormatError)
  })

  it('replaceChunk mutates only the named chunk', async () => {
    const raw = await buildContainer(makeContainer())
    const parsed = await parseContainer(raw)
    const next = replaceChunk(parsed, 'S_User', new Uint8Array([9, 9]))
    const raw2 = await buildContainer(next)
    const parsed2 = await parseContainer(raw2)
    expect(getChunk(parsed2, 'S_User')!.data).toEqual(new Uint8Array([9, 9]))
    expect(getChunk(parsed2, 'S_Date')!.data).toEqual(new Uint8Array(8).fill(7))
  })

  it('payload decompresses to identical bytes across rebuild (zlib level may differ)', async () => {
    const raw = await buildContainer(makeContainer())
    const parsed = await parseContainer(raw)
    const raw2 = await buildContainer(parsed)
    const parsed2 = await parseContainer(raw2)
    expect(parsed2.chunks.map((c) => c.data)).toEqual(parsed.chunks.map((c) => c.data))
  })
})
