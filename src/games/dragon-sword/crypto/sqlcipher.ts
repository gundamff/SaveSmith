/**
 * Clean-room SQLCipher v4 page encrypt/decrypt (cipher_compatibility = 4).
 *
 * Public format references (algorithm only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 * - https://www.zetetic.net/sqlcipher/design/
 *
 * Layout:
 * - page size 4096; reserve = 16-byte IV + 64-byte HMAC-SHA512
 * - file salt = first 16 bytes (page 1 is not encrypted in that region)
 * - encKey = PBKDF2-HMAC-SHA512(passphrase UTF-8, salt, 256000, 32)
 * - hmacSalt[i] = salt[i] ^ 0x3a; hmacKey = PBKDF2-HMAC-SHA512(encKey, hmacSalt, 2, 32)
 * - AES-256-CBC, no padding (cipher region is block-aligned)
 * - HMAC-SHA512(hmacKey, ciphertext || IV || pageNo_le32), page numbers 1-based
 * - decrypt restores SQLite magic over the salt on page 1
 *
 * Uses node-forge so the codec stays synchronous in both Vitest and the Tauri
 * WebView (no `fs` / Tauri invoke). In Node, forge's PBKDF2 uses native
 * `crypto.pbkdf2Sync` when the digest is the string `'sha512'`.
 */
import forge from 'node-forge'
import { SQLCIPHER_PASSPHRASE } from './passphrase'

export { SQLCIPHER_PASSPHRASE }

export const PAGE_SIZE = 4096
export const KDF_ITERATIONS = 256000
export const HMAC_SALT_MASK = 0x3a

const SALT_SIZE = 16
const IV_SIZE = 16
const HMAC_SIZE = 64
const RESERVE = IV_SIZE + HMAC_SIZE
const KEY_SIZE = 32
const SQLITE_MAGIC = new TextEncoder().encode('SQLite format 3\0')

export function readSalt(encrypted: Uint8Array): Uint8Array {
  if (encrypted.length < SALT_SIZE) {
    throw new Error('sqlcipher file too short to contain salt')
  }
  return encrypted.slice(0, SALT_SIZE)
}

export function encryptSqlCipher(
  plaintext: Uint8Array,
  salt: Uint8Array,
  passphrase: string = SQLCIPHER_PASSPHRASE
): Uint8Array {
  assertPageAligned(plaintext, 'plaintext')
  if (salt.length !== SALT_SIZE) {
    throw new Error('sqlcipher salt must be 16 bytes')
  }
  const saltCopy = salt.slice()
  const keys = deriveKeys(passphrase, saltCopy)
  const output = new Uint8Array(plaintext.length)
  const pageCount = plaintext.length / PAGE_SIZE
  for (let i = 0; i < pageCount; i++) {
    encryptPage(plaintext, output, i + 1, saltCopy, keys)
  }
  return output
}

export function decryptSqlCipher(
  encrypted: Uint8Array,
  passphrase: string = SQLCIPHER_PASSPHRASE
): Uint8Array {
  assertPageAligned(encrypted, 'ciphertext')
  const salt = readSalt(encrypted)
  const keys = deriveKeys(passphrase, salt)
  const output = new Uint8Array(encrypted.length)
  const pageCount = encrypted.length / PAGE_SIZE
  for (let i = 0; i < pageCount; i++) {
    decryptPage(encrypted, output, i + 1, keys)
  }
  return output
}

interface DerivedKeys {
  encKey: Uint8Array
  hmacKey: Uint8Array
}

function deriveKeys(passphrase: string, salt: Uint8Array): DerivedKeys {
  const passBytes = new TextEncoder().encode(passphrase)
  const encKey = pbkdf2Sha512(passBytes, salt, KDF_ITERATIONS, KEY_SIZE)
  const hmacSalt = new Uint8Array(salt.length)
  for (let i = 0; i < salt.length; i++) {
    hmacSalt[i] = salt[i]! ^ HMAC_SALT_MASK
  }
  const hmacKey = pbkdf2Sha512(encKey, hmacSalt, 2, KEY_SIZE)
  return { encKey, hmacKey }
}

function encryptPage(
  plaintext: Uint8Array,
  output: Uint8Array,
  pgno: number,
  salt: Uint8Array,
  keys: DerivedKeys
): void {
  const pageOff = (pgno - 1) * PAGE_SIZE
  const src = plaintext.subarray(pageOff, pageOff + PAGE_SIZE)
  const dst = output.subarray(pageOff, pageOff + PAGE_SIZE)
  const dataOff = pgno === 1 ? SALT_SIZE : 0
  if (pgno === 1) {
    dst.set(salt, 0)
  }
  const cipherEnd = PAGE_SIZE - RESERVE
  const iv = randomIv()
  const ciphertext = aes256cbc(true, keys.encKey, iv, src.subarray(dataOff, cipherEnd))
  dst.set(ciphertext, dataOff)
  dst.set(iv, cipherEnd)
  dst.set(pageHmac(keys.hmacKey, ciphertext, iv, pgno), cipherEnd + IV_SIZE)
}

function decryptPage(encrypted: Uint8Array, output: Uint8Array, pgno: number, keys: DerivedKeys): void {
  const pageOff = (pgno - 1) * PAGE_SIZE
  const src = encrypted.subarray(pageOff, pageOff + PAGE_SIZE)
  const dst = output.subarray(pageOff, pageOff + PAGE_SIZE)
  const dataOff = pgno === 1 ? SALT_SIZE : 0
  const cipherEnd = PAGE_SIZE - RESERVE
  const ciphertext = src.subarray(dataOff, cipherEnd)
  const iv = src.subarray(cipherEnd, cipherEnd + IV_SIZE)
  const storedHmac = src.subarray(cipherEnd + IV_SIZE, cipherEnd + IV_SIZE + HMAC_SIZE)
  const expected = pageHmac(keys.hmacKey, ciphertext, iv, pgno)
  if (!hmacEqual(storedHmac, expected)) {
    throw new Error(`sqlcipher HMAC mismatch on page ${pgno}`)
  }
  dst.set(aes256cbc(false, keys.encKey, iv, ciphertext), dataOff)
  if (pgno === 1) {
    dst.set(SQLITE_MAGIC, 0)
  }
}

function pageHmac(hmacKey: Uint8Array, ciphertext: Uint8Array, iv: Uint8Array, pgno: number): Uint8Array {
  const hmac = forge.hmac.create()
  hmac.start('sha512', bytesToBinary(hmacKey))
  hmac.update(bytesToBinary(ciphertext))
  hmac.update(bytesToBinary(iv))
  hmac.update(bytesToBinary(pageNoLe32(pgno)))
  return binaryToBytes(hmac.digest().getBytes())
}

function pageNoLe32(pgno: number): Uint8Array {
  const out = new Uint8Array(4)
  out[0] = pgno & 0xff
  out[1] = (pgno >>> 8) & 0xff
  out[2] = (pgno >>> 16) & 0xff
  out[3] = (pgno >>> 24) & 0xff
  return out
}

function pbkdf2Sha512(password: Uint8Array, salt: Uint8Array, iterations: number, keyLen: number): Uint8Array {
  const derived = forge.pkcs5.pbkdf2(
    bytesToBinary(password),
    bytesToBinary(salt),
    iterations,
    keyLen,
    'sha512'
  )
  return binaryToBytes(derived)
}

function aes256cbc(encrypt: boolean, key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const cipher = encrypt
    ? forge.cipher.createCipher('AES-CBC', bytesToBinary(key))
    : forge.cipher.createDecipher('AES-CBC', bytesToBinary(key))
  cipher.start({ iv: bytesToBinary(iv) })
  cipher.update(forge.util.createBuffer(bytesToBinary(data)))
  // @types/node-forge omits CBC's optional pad callback; runtime accepts it.
  const cbc = cipher as unknown as {
    finish: (pad?: (_blockSize: number, _buf: unknown, _decrypt: boolean) => boolean) => boolean
  }
  const ok = cbc.finish((_blockSize, _buf, _decrypt) => true)
  if (!ok) {
    throw new Error('sqlcipher AES-CBC failed')
  }
  return binaryToBytes(cipher.output.getBytes())
}

function hmacEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!
  }
  return diff === 0
}

function randomIv(): Uint8Array {
  const iv = new Uint8Array(IV_SIZE)
  globalThis.crypto.getRandomValues(iv)
  return iv
}

function assertPageAligned(bytes: Uint8Array, label: string): void {
  if (bytes.length === 0 || bytes.length % PAGE_SIZE !== 0) {
    throw new Error(`sqlcipher ${label} must be a non-empty multiple of ${PAGE_SIZE}`)
  }
}

function bytesToBinary(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]!)
  }
  return s
}

function binaryToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff
  }
  return out
}
