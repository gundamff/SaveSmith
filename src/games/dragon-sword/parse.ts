/**
 * Parse/serialize DragonSword slot databases (SQLCipher v4 + sql.js).
 *
 * Public format references (algorithm/schema only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Serialize writes only the slot `*_Slot*.db`. SPack GVAS / screenshots are never emitted.
 * Plaintext pages must keep SQLite header reserved_bytes=80 (SQLCipher IV+HMAC); parse
 * stores the decrypted image as `plaintextBase` so serialize never re-encrypts a reserved=0 file.
 */
import { ModuleError } from '@sdk/error'
import { bytesEqual } from '@sdk/session'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { decryptSqlCipher, encryptSqlCipher, readSalt } from './crypto/sqlcipher'
import { exportSqlite, integrityCheck, openSqlite } from './db/sqlite'
import { applySave } from './model/applySave'
import { loadSave } from './model/loadSave'
import type { DragonSwordState } from './model/types'

export type { DragonSwordState }

const SLOT_DB = /_Slot[^\\/]*\.db$/i

function findSlotFile(files: SlotBytes[]): SlotBytes | undefined {
  return files.find((f) => SLOT_DB.test(f.relativePath.replace(/\\/g, '/')))
}

export async function parse(files: SlotBytes[]): Promise<DragonSwordState> {
  const file = findSlotFile(files)
  if (!file) throw new ModuleError('MISSING_FIELD', ['*_Slot*.db'])
  let salt: Uint8Array
  let plaintext: Uint8Array
  try {
    salt = readSalt(file.bytes)
    plaintext = decryptSqlCipher(file.bytes)
  } catch (e) {
    if (e instanceof ModuleError) throw e
    throw new ModuleError('DECRYPT_FAILED', [])
  }
  const db = await openSqlite(plaintext)
  try {
    return loadSave(db, {
      relativePath: file.relativePath.replace(/\\/g, '/'),
      salt,
      plaintextBase: plaintext
    })
  } finally {
    db.close()
  }
}

export async function serialize(state: DragonSwordState): Promise<SerializedFile[]> {
  const db = await openSqlite(state.plaintextBase.slice())
  try {
    applySave(db, state)
    integrityCheck(db)
    const exported = exportSqlite(db)
    const encrypted = encryptSqlCipher(exported, state.salt)
    let verified: Uint8Array
    try {
      verified = decryptSqlCipher(encrypted)
    } catch (e) {
      if (e instanceof ModuleError) throw e
      throw new ModuleError('SERIALIZE_FAILED', ['sqlcipher-verify'])
    }
    if (!bytesEqual(verified, exported)) {
      throw new ModuleError('SERIALIZE_FAILED', ['sqlcipher-verify'])
    }
    return [{ relativePath: state.relativePath, bytes: encrypted }]
  } finally {
    db.close()
  }
}

export function validate(_state: DragonSwordState): ValidationIssue[] {
  return []
}
