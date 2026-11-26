import forge from 'node-forge'
import { ModuleError } from '@sdk/error'

/** Base64 key string from FrameWork.Tool.GameDataKey (client constant). */
const GAME_DATA_KEY_B64 = 'kujs1kkdlo4454GG00105sajuklmbkdl'

function keyBinary(): string {
  return forge.util.decode64(GAME_DATA_KEY_B64)
}

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

function aesEcbPkcs7(encrypt: boolean, data: Uint8Array): Uint8Array {
  if (!encrypt && (data.length === 0 || data.length % 16 !== 0)) {
    throw new ModuleError('INVALID_FORMAT', ['AES-ECB length'])
  }
  const cipher = encrypt
    ? forge.cipher.createCipher('AES-ECB', keyBinary())
    : forge.cipher.createDecipher('AES-ECB', keyBinary())
  cipher.start()
  cipher.update(forge.util.createBuffer(bytesToBinary(data)))
  if (!cipher.finish()) throw new ModuleError('INVALID_FORMAT', ['AES-ECB PKCS7'])
  return binaryToBytes(cipher.output.getBytes())
}

export function decryptSaveDat(cipher: Uint8Array): Uint8Array {
  return aesEcbPkcs7(false, cipher)
}

export function encryptSaveDat(plain: Uint8Array): Uint8Array {
  return aesEcbPkcs7(true, plain)
}