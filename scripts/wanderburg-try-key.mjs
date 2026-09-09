#!/usr/bin/env node
/**
 * Try candidate passphrases against a Wanderburg SaveData.json (StringCipher format).
 * Usage: node scripts/wanderburg-try-key.mjs --save <path> [--key <passphrase>]
 */
import fs from 'node:fs'
import forge from 'node-forge'
import Rijndael from 'rijndael-js'

const KEYSIZE_BYTES = 32
const BLOCK_BITS = 256
const PBKDF2_ITERATIONS = 1000

const DEFAULT_CANDIDATES = [
  'edugfhseufgoqwuiehrieutahl',
  'ThisIsTheKey',
  'yourDefaultKey',
  'SaltTextGoesHere'
]

function parseArgs(argv) {
  const out = { save: null, keys: [...DEFAULT_CANDIDATES] }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--save' && argv[i + 1]) {
      out.save = argv[++i]
    } else if (argv[i] === '--key' && argv[i + 1]) {
      out.keys = [argv[++i]]
    }
  }
  return out
}

function deriveKeyBytes(password, salt) {
  const derived = forge.pkcs5.pbkdf2(
    password,
    salt.toString('binary'),
    PBKDF2_ITERATIONS,
    KEYSIZE_BYTES,
    forge.md.sha1.create()
  )
  return Buffer.from(derived, 'binary')
}

function trimPlaintext(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    const lastBrace = trimmed.lastIndexOf('}')
    if (lastBrace >= 0) return trimmed.slice(0, lastBrace + 1)
  }
  return trimmed
}

function tryDecryptKey(fileBytes, key) {
  try {
    const base64 = new TextDecoder().decode(fileBytes).trim()
    const payload = Buffer.from(base64, 'base64')
    if (payload.length < KEYSIZE_BYTES * 2) return null
    const salt = payload.subarray(0, KEYSIZE_BYTES)
    const iv = payload.subarray(KEYSIZE_BYTES, KEYSIZE_BYTES * 2)
    const ciphertext = payload.subarray(KEYSIZE_BYTES * 2)
    const keyBytes = deriveKeyBytes(key, salt)
    const cipher = new Rijndael(keyBytes, 'cbc')
    const plain = trimPlaintext(
      Buffer.from(cipher.decrypt(ciphertext, BLOCK_BITS, iv)).toString('utf8')
    )
    if (!plain.startsWith('{')) return null
    JSON.parse(plain)
    return plain
  } catch {
    return null
  }
}

const { save, keys } = parseArgs(process.argv)
if (!save) {
  console.error('Usage: node scripts/wanderburg-try-key.mjs --save <SaveData.json> [--key <passphrase>]')
  process.exit(2)
}

const fileBytes = new Uint8Array(fs.readFileSync(save))
let matched = false
for (const key of keys) {
  const plain = tryDecryptKey(fileBytes, key)
  if (plain) {
    console.log('SUCCESS key=', JSON.stringify(key))
    console.log(plain.slice(0, 200) + (plain.length > 200 ? '…' : ''))
    matched = true
    break
  }
  console.log('fail key=', JSON.stringify(key))
}

process.exit(matched ? 0 : 1)
