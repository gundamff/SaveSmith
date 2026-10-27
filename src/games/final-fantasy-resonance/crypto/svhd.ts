/**
 * FINAL FANTASY RESONANCE SVHD container.
 *
 * Public format (Clean-room; see docs/design/2026-10-27-final-fantasy-resonance-design.md):
 * - 32-byte header: magic `SVHD`, two u16le version fields, SHA-1(ciphertext), 4 zero bytes
 * - Body: AES-256-ECB, no PKCS padding (plaintext length must be a multiple of 16)
 *
 * Format constants are publicly documented by community save tools (MIT ffr-save-editor /
 * ffr-save-tracker). This module reimplements the algorithm; it does not copy their source.
 */
import forge from 'node-forge'
import { ModuleError } from '@sdk/error'

export const HEADER_SIZE = 32
export const AES_BLOCK = 16

/** UTF-8 bytes of the publicly documented AES-256 key. */
const KEY_UTF8 = 'wwrqPkdwzPvgfchQ8kTYHVbn4umTf3d7'

function bytesToBinary(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return s
}

function binaryToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

function sha1(data: Uint8Array): Uint8Array {
  const md = forge.md.sha1.create()
  md.update(bytesToBinary(data))
  return binaryToBytes(md.digest().getBytes())
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

function aesEcb(encrypt: boolean, data: Uint8Array): Uint8Array {
  if (data.length === 0 || data.length % AES_BLOCK !== 0) {
    throw new ModuleError('INVALID_FORMAT', ['AES body length'])
  }
  const keyBin = KEY_UTF8
  const cipher = encrypt
    ? forge.cipher.createCipher('AES-ECB', keyBin)
    : forge.cipher.createDecipher('AES-ECB', keyBin)
  cipher.start()
  cipher.update(forge.util.createBuffer(bytesToBinary(data)))
  const finishable = cipher as unknown as {
    finish: (pad?: (_blockSize: number, _buf: unknown, _decrypt: boolean) => boolean) => boolean
  }
  const ok = finishable.finish(() => true)
  if (!ok) throw new ModuleError('INVALID_FORMAT', ['AES-ECB'])
  return binaryToBytes(cipher.output.getBytes())
}

export function decryptSvhd(raw: Uint8Array): { header: Uint8Array; plain: Uint8Array } {
  if (raw.length < HEADER_SIZE) throw new ModuleError('INVALID_FORMAT', ['SVHD truncated'])
  if (raw[0] !== 0x53 || raw[1] !== 0x56 || raw[2] !== 0x48 || raw[3] !== 0x44) {
    throw new ModuleError('INVALID_FORMAT', ['SVHD'])
  }
  const header = raw.subarray(0, HEADER_SIZE)
  const body = raw.subarray(HEADER_SIZE)
  if (body.length === 0 || body.length % AES_BLOCK !== 0) {
    throw new ModuleError('INVALID_FORMAT', ['SVHD body'])
  }
  const expected = header.subarray(8, 28)
  const actual = sha1(body)
  if (!timingSafeEqual(expected, actual)) {
    throw new ModuleError('CHECKSUM_MISMATCH', ['SVHD SHA-1'])
  }
  return { header: new Uint8Array(header), plain: aesEcb(false, body) }
}

export function encryptSvhd(header: Uint8Array, plain: Uint8Array): Uint8Array {
  if (header.length < HEADER_SIZE) throw new ModuleError('INVALID_FORMAT', ['SVHD header'])
  if (plain.length === 0 || plain.length % AES_BLOCK !== 0) {
    throw new ModuleError('INVALID_FORMAT', ['AES plain length'])
  }
  const body = aesEcb(true, plain)
  const out = new Uint8Array(HEADER_SIZE + body.length)
  out.set(header.subarray(0, HEADER_SIZE), 0)
  out[0] = 0x53
  out[1] = 0x56
  out[2] = 0x48
  out[3] = 0x44
  out.set(body, HEADER_SIZE)
  out.set(sha1(body), 8)
  out[28] = 0
  out[29] = 0
  out[30] = 0
  out[31] = 0
  return out
}
