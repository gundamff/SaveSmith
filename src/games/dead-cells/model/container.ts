/// <reference types="node" />

/**
 * Dead Cells save container: 59-byte header + zlib payload of flag-ordered
 * chunks. SHA-1 integrity covers the whole file with the checksum field zeroed.
 */

export const HEADER_SIZE = 59
const CHECKSUM_OFFSET = 5
const CHECKSUM_SIZE = 20
const MAGIC_PC = 0x11ceadde

export interface DcContainerHeader {
  magic: Uint8Array
  version: number
  sha1: Uint8Array
  githash: Uint8Array
  buildDate: Uint8Array
  flags: number
}

export interface DcContainerChunk {
  bit: number
  name: string
  data: Uint8Array
}

export interface DcContainer {
  header: DcContainerHeader
  chunks: DcContainerChunk[]
}

export interface ChunkSpec {
  bit: number
  name: string
  kind: 'hxbit' | 'date' | 'float' | 'raw' | 'flag'
}

export const CHUNK_SPECS: ChunkSpec[] = [
  { bit: 0x001, name: 'S_User', kind: 'hxbit' },
  { bit: 0x002, name: 'S_Game', kind: 'hxbit' },
  { bit: 0x004, name: 'S_UserAndGameData', kind: 'hxbit' },
  { bit: 0x008, name: 'S_Date', kind: 'date' },
  { bit: 0x010, name: 'S_Experimental', kind: 'flag' },
  { bit: 0x020, name: 'S_UsesMods', kind: 'flag' },
  { bit: 0x040, name: 'S_HaveLore', kind: 'flag' },
  { bit: 0x080, name: 'S_VersionNumber', kind: 'float' },
  { bit: 0x100, name: 'S_DLCMask', kind: 'raw' }
]

const FEATURE_FLAG_MASK = 0x010 | 0x020 | 0x040

export class DcFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DcFormatError'
  }
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(cs)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function sha1(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-1', data as unknown as BufferSource)
  return new Uint8Array(digest)
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function isChecksumValid(raw: Uint8Array): boolean {
  if (raw.length < HEADER_SIZE) return false
  const stored = raw.slice(CHECKSUM_OFFSET, CHECKSUM_OFFSET + CHECKSUM_SIZE)
  if (stored.every((b) => b === 0)) return false
  return true
}

export async function verifyChecksum(raw: Uint8Array): Promise<boolean> {
  if (raw.length < HEADER_SIZE) return false
  const zeroed = raw.slice()
  zeroed.fill(0, CHECKSUM_OFFSET, CHECKSUM_OFFSET + CHECKSUM_SIZE)
  const computed = await sha1(zeroed)
  const stored = raw.slice(CHECKSUM_OFFSET, CHECKSUM_OFFSET + CHECKSUM_SIZE)
  return bytesEqual(computed, stored)
}

export async function parseContainer(raw: Uint8Array): Promise<DcContainer> {
  if (raw.length < HEADER_SIZE) {
    throw new DcFormatError('file too small to be a Dead Cells save')
  }
  const magicU32 = new DataView(raw.buffer, raw.byteOffset, 4).getUint32(0, true)
  if (magicU32 !== MAGIC_PC) {
    throw new DcFormatError(
      `unknown magic 0x${magicU32.toString(16)} (expected PC 0x${MAGIC_PC.toString(16)})`
    )
  }
  if (!(await verifyChecksum(raw))) {
    throw new DcFormatError('header SHA-1 mismatch: file is corrupt or modified')
  }
  const header: DcContainerHeader = {
    magic: raw.slice(0, 4),
    version: raw[4]!,
    sha1: raw.slice(CHECKSUM_OFFSET, CHECKSUM_OFFSET + CHECKSUM_SIZE),
    githash: raw.slice(25, 45),
    buildDate: raw.slice(45, 55),
    flags: new DataView(raw.buffer, raw.byteOffset + 55, 4).getUint32(0, true)
  }
  let payload: Uint8Array
  try {
    payload = await inflate(raw.slice(HEADER_SIZE))
  } catch {
    throw new DcFormatError('payload is not valid zlib')
  }
  const chunks: DcContainerChunk[] = []
  let p = 0
  for (const spec of CHUNK_SPECS) {
    if (spec.kind === 'flag') continue
    if ((header.flags & spec.bit) === 0) continue
    if (p + 4 > payload.length) throw new DcFormatError(`truncated chunk header for ${spec.name}`)
    const size = new DataView(payload.buffer, payload.byteOffset + p, 4).getUint32(0, true)
    p += 4
    if (p + size > payload.length) throw new DcFormatError(`truncated chunk body for ${spec.name}`)
    chunks.push({ bit: spec.bit, name: spec.name, data: payload.slice(p, p + size) })
    p += size
  }
  if (p !== payload.length) {
    throw new DcFormatError(`payload has ${payload.length - p} unconsumed bytes`)
  }
  return { header, chunks }
}

export async function buildContainer(container: DcContainer): Promise<Uint8Array> {
  const body: Uint8Array[] = []
  let bodyLen = 0
  for (const spec of CHUNK_SPECS) {
    if (spec.kind === 'flag') continue
    const chunk = container.chunks.find((c) => c.bit === spec.bit)
    if (!chunk) continue
    const size = new Uint8Array(4)
    new DataView(size.buffer).setUint32(0, chunk.data.length, true)
    body.push(size, chunk.data)
    bodyLen += 4 + chunk.data.length
  }
  const payload = new Uint8Array(bodyLen)
  let off = 0
  for (const part of body) {
    payload.set(part, off)
    off += part.length
  }
  const compressed = await deflate(payload)

  let flags = container.header.flags & FEATURE_FLAG_MASK
  for (const chunk of container.chunks) {
    if (CHUNK_SPECS.find((s) => s.bit === chunk.bit)?.kind === 'flag') continue
    flags |= chunk.bit
  }

  const out = new Uint8Array(HEADER_SIZE + compressed.length)
  out.set(container.header.magic, 0)
  out[4] = container.header.version
  out.set(container.header.githash, 25)
  out.set(container.header.buildDate, 45)
  new DataView(out.buffer, out.byteOffset + 55, 4).setUint32(0, flags, true)
  out.set(compressed, HEADER_SIZE)
  const sum = await sha1(out)
  out.set(sum, CHECKSUM_OFFSET)
  return out
}

export function getChunk(container: DcContainer, name: string): DcContainerChunk | undefined {
  return container.chunks.find((c) => c.name === name)
}

export function replaceChunk(
  container: DcContainer,
  name: string,
  data: Uint8Array
): DcContainer {
  return {
    header: container.header,
    chunks: container.chunks.map((c) => (c.name === name ? { ...c, data } : c))
  }
}
