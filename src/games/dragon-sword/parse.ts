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

function nonNegativeFinite(n: number): boolean {
  return Number.isFinite(n) && n >= 0
}

export function validate(state: DragonSwordState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const row of state.currencies) {
    if (!nonNegativeFinite(row.amount)) {
      issues.push({ code: 'INVALID_AMOUNT', args: [row.itemCid] })
    }
  }
  for (const row of state.stackables) {
    if (!nonNegativeFinite(row.stackCnt)) {
      issues.push({ code: 'INVALID_STACK', args: [row.itemCid] })
    }
  }
  for (const row of state.cookItems) {
    if (!nonNegativeFinite(row.stackCnt)) {
      issues.push({ code: 'INVALID_STACK', args: [row.itemCid] })
    }
  }
  for (const axis of ['posX', 'posY', 'posZ'] as const) {
    if (!Number.isFinite(state.user[axis])) {
      issues.push({ code: 'INVALID_POSITION', args: [axis] })
    }
  }
  const owned = new Set(state.characters.map((c) => c.characterCid))
  for (const team of state.teams) {
    for (const cid of [team.slot1, team.slot2, team.slot3]) {
      if (cid !== 0 && !owned.has(cid)) {
        issues.push({ code: 'UNKNOWN_TEAM_CID', args: [team.pageId, cid] })
      }
    }
  }
  return issues
}
