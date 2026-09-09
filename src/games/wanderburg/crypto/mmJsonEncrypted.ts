/**
 * SaveLoad.StringCipher (Rijndael-256-CBC) — NOT Feel MM JsonEncrypted.
 * Filename `mmJsonEncrypted.ts` is historical (Task 3 assumed Feel defaults).
 * PBKDF2-SHA1 (1000) + per-file salt/IV; on-disk UTF-8 Base64 of [salt|iv|cipher].
 */
import forge from 'node-forge'
import Rijndael from 'rijndael-js'
const KEYSIZE_BYTES = 32
const BLOCK_BITS = 256
const PBKDF2_ITERATIONS = 1000

function deriveKeyBytes(password: string, salt: Buffer): Buffer {
  const derived = forge.pkcs5.pbkdf2(
    password,
    salt.toString('binary'),
    PBKDF2_ITERATIONS,
    KEYSIZE_BYTES,
    forge.md.sha1.create()
  )
  return Buffer.from(derived, 'binary')
}

function randomBytes(count: number): Buffer {
  return Buffer.from(forge.random.getBytesSync(count), 'binary')
}

/** Rijndael decrypt zero-pads to block size; trailing nulls/garbage follow the JSON `}`. */
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

/** Encrypt UTF-8 JSON text to on-disk bytes (UTF-8 encoding of Base64 ciphertext). */
export function encryptUtf8ToSaveBytes(plainUtf8: string, key: string): Uint8Array {
  const salt = randomBytes(KEYSIZE_BYTES)
  const iv = randomBytes(KEYSIZE_BYTES)
  const keyBytes = deriveKeyBytes(key, salt)
  const cipher = new Rijndael(keyBytes, 'cbc')
  const encrypted = Buffer.from(cipher.encrypt(Buffer.from(plainUtf8, 'utf8'), BLOCK_BITS, iv))
  const payload = Buffer.concat([salt, iv, encrypted])
  return new TextEncoder().encode(payload.toString('base64'))
}

/** Decrypt on-disk bytes (UTF-8 Base64 text) back to UTF-8 JSON text. */
export function decryptSaveBytesToUtf8(fileBytes: Uint8Array, key: string): string {
  const base64 = new TextDecoder().decode(fileBytes).trim()
  const payload = Buffer.from(base64, 'base64')
  if (payload.length < KEYSIZE_BYTES * 2) {
    throw new Error('decryption failed')
  }
  const salt = payload.subarray(0, KEYSIZE_BYTES)
  const iv = payload.subarray(KEYSIZE_BYTES, KEYSIZE_BYTES * 2)
  const ciphertext = payload.subarray(KEYSIZE_BYTES * 2)
  const keyBytes = deriveKeyBytes(key, salt)
  const cipher = new Rijndael(keyBytes, 'cbc')
  const plainUtf8 = trimDecryptedPlaintext(
    Buffer.from(cipher.decrypt(ciphertext, BLOCK_BITS, iv)).toString('utf8')
  )
  try {
    JSON.parse(plainUtf8)
  } catch {
    throw new Error('decryption failed')
  }
  return plainUtf8
}
