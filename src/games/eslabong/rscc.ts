import { ZstdCodec } from 'zstd-codec'

const MAGIC = new TextEncoder().encode('RSCC')
const MODE_ZSTD = 2

type ZstdSimple = {
  compress(data: Uint8Array | ArrayBuffer): Uint8Array
  decompress(data: Uint8Array | ArrayBuffer): Uint8Array
}

let simplePromise: Promise<ZstdSimple> | null = null

function getSimple(): Promise<ZstdSimple> {
  if (!simplePromise) {
    simplePromise = new Promise((resolve, reject) => {
      try {
        ZstdCodec.run((zstd) => {
          resolve(new zstd.Simple() as ZstdSimple)
        })
      } catch (e) {
        reject(e)
      }
    })
  }
  return simplePromise
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function writeU32(buf: Uint8Array, offset: number, value: number): void {
  new DataView(buf.buffer, buf.byteOffset, buf.byteLength).setUint32(offset, value, true)
}

export async function decompressRscc(bytes: Uint8Array): Promise<Uint8Array> {
  if (bytes.length < 16) throw new Error('RSCC: truncated header')
  if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1] || bytes[2] !== MAGIC[2] || bytes[3] !== MAGIC[3]) {
    throw new Error('RSCC: bad magic')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const mode = readU32(view, 4)
  if (mode !== MODE_ZSTD) throw new Error(`RSCC: unsupported mode ${mode}`)
  const blockSize = readU32(view, 8)
  if (blockSize === 0) throw new Error('RSCC: block size 0')
  const total = readU32(view, 12)
  const blockCount = Math.floor(total / blockSize) + 1
  let offset = 16
  const sizes: number[] = []
  for (let i = 0; i < blockCount; i++) {
    if (offset + 4 > bytes.length) throw new Error('RSCC: truncated size table')
    sizes.push(readU32(view, offset))
    offset += 4
  }
  const zstd = await getSimple()
  const out = new Uint8Array(total)
  let writeAt = 0
  for (let i = 0; i < blockCount; i++) {
    const csize = sizes[i]!
    if (offset + csize > bytes.length) throw new Error('RSCC: truncated block')
    const comp = bytes.subarray(offset, offset + csize)
    offset += csize
    // Exact multiple of blockSize still emits a final empty block (Godot rule).
    const blen = i < blockCount - 1 ? blockSize : total % blockSize
    if (blen === 0) continue
    const dec = zstd.decompress(comp)
    if (dec.length < blen) throw new Error(`RSCC: short decompress block ${i}`)
    out.set(dec.subarray(0, blen), writeAt)
    writeAt += blen
  }
  return out
}

export async function compressRscc(
  plain: Uint8Array,
  opts?: { blockSize?: number }
): Promise<Uint8Array> {
  const blockSize = opts?.blockSize ?? 4096
  const total = plain.length
  const blockCount = Math.floor(total / blockSize) + 1
  const zstd = await getSimple()
  const compressed: Uint8Array[] = []
  const sizes: number[] = []
  for (let i = 0; i < blockCount; i++) {
    const start = i * blockSize
    const end = Math.min(start + blockSize, total)
    const slice = plain.subarray(start, end)
    // Last block may be empty when total is exact multiple — Godot still emits one block.
    const payload = slice.length === 0 ? new Uint8Array(0) : slice
    const comp = zstd.compress(payload)
    compressed.push(comp)
    sizes.push(comp.length)
  }
  const header = 16 + blockCount * 4
  const bodyLen = sizes.reduce((a, b) => a + b, 0)
  const out = new Uint8Array(header + bodyLen)
  out.set(MAGIC, 0)
  writeU32(out, 4, MODE_ZSTD)
  writeU32(out, 8, blockSize)
  writeU32(out, 12, total)
  let offset = 16
  for (const size of sizes) {
    writeU32(out, offset, size)
    offset += 4
  }
  for (const block of compressed) {
    out.set(block, offset)
    offset += block.length
  }
  return out
}
