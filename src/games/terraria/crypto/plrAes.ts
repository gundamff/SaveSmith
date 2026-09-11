/**
 * Terraria .plr AES-128-CBC.
 * Key and IV are UTF-16LE bytes of "h3y_gUyZ" (16 bytes).
 * No PKCS padding — length must be a multiple of 16; encrypt zero-pads.
 */
import Rijndael from 'rijndael-js'
import { ModuleError } from '@sdk/error'

const BLOCK = 16
const PASSWORD = 'h3y_gUyZ'

function keyIvBytes(): Uint8Array {
  const out = new Uint8Array(BLOCK)
  for (let i = 0; i < PASSWORD.length; i++) {
    const c = PASSWORD.charCodeAt(i)
    out[i * 2] = c & 0xff
    out[i * 2 + 1] = (c >> 8) & 0xff
  }
  return out
}

function zeroPad(data: Uint8Array): Uint8Array {
  if (data.length % BLOCK === 0) return data
  const n = Math.ceil(data.length / BLOCK) * BLOCK
  const out = new Uint8Array(n)
  out.set(data)
  return out
}

function asBlockArray(bytes: Uint8Array): number[] {
  return Array.from(bytes)
}

export function decryptPlr(encrypted: Uint8Array): Uint8Array {
  if (encrypted.length === 0 || encrypted.length % BLOCK !== 0) {
    throw new ModuleError('DECRYPT_FAILED', ['plr-length'])
  }
  const key = keyIvBytes()
  const cipher = new Rijndael(asBlockArray(key), 'cbc')
  const decrypted = cipher.decrypt(asBlockArray(encrypted), BLOCK * 8, asBlockArray(key))
  const plain = decrypted instanceof Uint8Array ? new Uint8Array(decrypted) : Uint8Array.from(decrypted as number[])
  if (plain.length < 11) {
    throw new ModuleError('DECRYPT_FAILED', ['plr-short'])
  }
  const magic = String.fromCharCode(
    plain[4]!,
    plain[5]!,
    plain[6]!,
    plain[7]!,
    plain[8]!,
    plain[9]!,
    plain[10]!
  )
  if (magic !== 'relogic') {
    throw new ModuleError('DECRYPT_FAILED', ['plr-magic'])
  }
  return plain
}

export function encryptPlr(plain: Uint8Array): Uint8Array {
  const padded = zeroPad(plain)
  const key = keyIvBytes()
  const cipher = new Rijndael(asBlockArray(key), 'cbc')
  const encrypted = cipher.encrypt(asBlockArray(padded), BLOCK * 8, asBlockArray(key))
  return encrypted instanceof Uint8Array ? new Uint8Array(encrypted) : Uint8Array.from(encrypted as number[])
}
