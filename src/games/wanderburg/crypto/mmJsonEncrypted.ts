/**
 * SaveLoad.StringCipher (Rijndael-256-CBC) — NOT Feel MM JsonEncrypted.
 * Filename `mmJsonEncrypted.ts` is historical (Task 3 assumed Feel defaults).
 * PBKDF2-SHA1 (1000) + per-file salt/IV; on-disk UTF-8 Base64 of [salt|iv|cipher].
 * Padding must be PKCS7 — .NET RijndaelManaged rejects zero-padding (Padding is invalid).
 *
 * Uses Uint8Array / atob / btoa only — must run in Tauri WebView (no Node Buffer).
 */
import forge from 'node-forge'
import Rijndael from 'rijndael-js'

const KEYSIZE_BYTES = 32
const BLOCK_BYTES = 32
const BLOCK_BITS = 256
const PBKDF2_ITERATIONS = 1000

function bytesToBinaryString(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]!)
  }
  return s
}

function binaryStringToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff
  }
  return out
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes)
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let len = 0
  for (const p of parts) len += p.length
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

function base64ToBytes(b64: string): Uint8Array {
  return binaryStringToBytes(atob(b64))
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(bytesToBinaryString(bytes))
}

function deriveKeyBytes(password: string, salt: Uint8Array): Uint8Array {
  const derived = forge.pkcs5.pbkdf2(
    password,
    bytesToBinaryString(salt),
    PBKDF2_ITERATIONS,
    KEYSIZE_BYTES,
    forge.md.sha1.create()
  )
  return binaryStringToBytes(derived)
}

function randomBytes(count: number): Uint8Array {
  return binaryStringToBytes(forge.random.getBytesSync(count))
}

/** PKCS7 pad so rijndael-js sees an already-aligned buffer and does not zero-pad. */
export function pkcs7Pad(data: Uint8Array, blockSize = BLOCK_BYTES): Uint8Array {
  const pad = blockSize - (data.length % blockSize)
  const out = new Uint8Array(data.length + pad)
  out.set(data)
  out.fill(pad, data.length)
  return out
}

export function pkcs7Unpad(data: Uint8Array, blockSize = BLOCK_BYTES): Uint8Array {
  if (data.length === 0 || data.length % blockSize !== 0) {
    throw new Error('invalid pkcs7 length')
  }
  const pad = data[data.length - 1]!
  if (pad < 1 || pad > blockSize || pad > data.length) {
    throw new Error('invalid pkcs7 pad')
  }
  for (let i = data.length - pad; i < data.length; i++) {
    if (data[i] !== pad) throw new Error('invalid pkcs7 pad')
  }
  return data.subarray(0, data.length - pad)
}

/** Fallback when pad bytes are corrupt: trim to the JSON object. */
function trimDecryptedPlaintext(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    const lastBrace = trimmed.lastIndexOf('}')
    if (lastBrace >= 0) {
      return trimmed.slice(0, lastBrace + 1)
    }
  }
  return trimmed
}

function decryptedBytesToUtf8(decrypted: Uint8Array): string {
  try {
    return new TextDecoder().decode(pkcs7Unpad(decrypted))
  } catch {
    return trimDecryptedPlaintext(new TextDecoder().decode(decrypted))
  }
}

/** Encrypt UTF-8 JSON text to on-disk bytes (UTF-8 encoding of Base64 ciphertext). */
export function encryptUtf8ToSaveBytes(plainUtf8: string, key: string): Uint8Array {
  const salt = randomBytes(KEYSIZE_BYTES)
  const iv = randomBytes(KEYSIZE_BYTES)
  const keyBytes = deriveKeyBytes(key, salt)
  const cipher = new Rijndael(keyBytes, 'cbc')
  const plainBytes = pkcs7Pad(new TextEncoder().encode(plainUtf8))
  // rijndael-js TypedArray path uses .buffer wholesale — always pass a fresh copy
  const encrypted = new Uint8Array(
    cipher.encrypt(copyBytes(plainBytes), BLOCK_BITS, copyBytes(iv))
  )
  const payload = concatBytes([salt, iv, encrypted])
  return new TextEncoder().encode(bytesToBase64(payload))
}

/** Decrypt on-disk bytes (UTF-8 Base64 text) back to UTF-8 JSON text. */
export function decryptSaveBytesToUtf8(fileBytes: Uint8Array, key: string): string {
  const base64 = new TextDecoder().decode(fileBytes).trim()
  const payload = base64ToBytes(base64)
  if (payload.length < KEYSIZE_BYTES * 2) {
    throw new Error('decryption failed')
  }
  const salt = copyBytes(payload.subarray(0, KEYSIZE_BYTES))
  const iv = copyBytes(payload.subarray(KEYSIZE_BYTES, KEYSIZE_BYTES * 2))
  const ciphertext = copyBytes(payload.subarray(KEYSIZE_BYTES * 2))
  const keyBytes = deriveKeyBytes(key, salt)
  const cipher = new Rijndael(keyBytes, 'cbc')
  const decrypted = new Uint8Array(cipher.decrypt(ciphertext, BLOCK_BITS, iv))
  const plainUtf8 = decryptedBytesToUtf8(decrypted)
  try {
    JSON.parse(plainUtf8)
  } catch {
    throw new Error('decryption failed')
  }
  return plainUtf8
}
