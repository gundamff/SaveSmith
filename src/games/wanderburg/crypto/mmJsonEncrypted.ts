import forge from 'node-forge'
import { DEFAULT_SALT } from './keys'

const PBKDF2_ITERATIONS = 1000
const KEY_BYTES = 32
const IV_BYTES = 16

function deriveKeyAndIv(password: string, salt: string): { key: string; iv: string } {
  const derived = forge.pkcs5.pbkdf2(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_BYTES + IV_BYTES,
    forge.md.sha1.create()
  )
  return {
    key: derived.substring(0, KEY_BYTES),
    iv: derived.substring(KEY_BYTES, KEY_BYTES + IV_BYTES)
  }
}

/** Encrypt UTF-8 JSON text to on-disk bytes (UTF-8 encoding of Base64 ciphertext). */
export function encryptUtf8ToSaveBytes(
  plainUtf8: string,
  key: string,
  salt: string = DEFAULT_SALT
): Uint8Array {
  const { key: aesKey, iv } = deriveKeyAndIv(key, salt)
  const cipher = forge.cipher.createCipher('AES-CBC', aesKey)
  cipher.start({ iv })
  cipher.update(forge.util.createBuffer(plainUtf8, 'utf8'))
  if (!cipher.finish()) {
    throw new Error('encryption failed')
  }
  const base64 = forge.util.encode64(cipher.output.getBytes())
  return new TextEncoder().encode(base64)
}

/** Decrypt on-disk bytes (UTF-8 Base64 text) back to UTF-8 JSON text. */
export function decryptSaveBytesToUtf8(
  fileBytes: Uint8Array,
  key: string,
  salt: string = DEFAULT_SALT
): string {
  const base64 = new TextDecoder().decode(fileBytes).trim()
  const encrypted = forge.util.decode64(base64)
  const { key: aesKey, iv } = deriveKeyAndIv(key, salt)
  const decipher = forge.cipher.createDecipher('AES-CBC', aesKey)
  decipher.start({ iv })
  decipher.update(forge.util.createBuffer(encrypted))
  if (!decipher.finish()) {
    throw new Error('decryption failed')
  }
  const plainUtf8 = forge.util.decodeUtf8(decipher.output.getBytes())
  try {
    JSON.parse(plainUtf8)
  } catch {
    throw new Error('decryption failed')
  }
  return plainUtf8
}
