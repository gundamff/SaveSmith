import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { decryptSqlCipher, encryptSqlCipher, readSalt } from '../../src/games/dragon-sword/crypto/sqlcipher'
import { exportSqlite, openSqlite, type SqlJsDb } from '../../src/games/dragon-sword/db/sqlite'
import { parse, serialize } from '../../src/games/dragon-sword/parse'

const SLOT_PATH = '136330193/136330193_Slot1.db'
const SQLCIPHER_RESERVED = 80

/** SQLCipher v4 pages keep 80 unused bytes for IV+HMAC; vanilla sql.js uses 0. */
async function exportSqlCipherPlaintext(db: SqlJsDb): Promise<Uint8Array> {
  const raw = exportSqlite(db)
  raw[20] = SQLCIPHER_RESERVED
  const tmp = await openSqlite(raw)
  tmp.exec('VACUUM')
  const out = exportSqlite(tmp)
  tmp.close()
  out[20] = SQLCIPHER_RESERVED
  return out
}

async function makeEncryptedSlot(): Promise<{ relativePath: string; bytes: Uint8Array; salt: Uint8Array }> {
  const db = await openSqlite(new Uint8Array())
  db.run('PRAGMA page_size = 4096')
  db.run(`CREATE TABLE tb_currency (
    USER_DBID INTEGER NOT NULL,
    ITEM_CID INTEGER NOT NULL,
    AMOUNT INTEGER NOT NULL,
    PRIMARY KEY (USER_DBID, ITEM_CID)
  )`)
  db.run(`CREATE TABLE tb_stackable_item (
    USER_DBID INTEGER NOT NULL,
    ITEM_CID INTEGER NOT NULL,
    STACK_CNT INTEGER NOT NULL,
    PRIMARY KEY (USER_DBID, ITEM_CID)
  )`)
  db.run('INSERT INTO tb_currency (USER_DBID, ITEM_CID, AMOUNT) VALUES (?, ?, ?)', [1000, 1000001, 50])
  db.run('INSERT INTO tb_stackable_item (USER_DBID, ITEM_CID, STACK_CNT) VALUES (?, ?, ?)', [
    1000, 2000001, 7
  ])
  const plain = await exportSqlCipherPlaintext(db)
  db.close()
  const salt = new Uint8Array(16)
  salt[0] = 0x11
  return { relativePath: SLOT_PATH, bytes: encryptSqlCipher(plain, salt), salt }
}

describe('dragon-sword parse/serialize', () => {
  it('parse decrypts a slot db and projects currency + stackables', async () => {
    const file = await makeEncryptedSlot()
    const state = await parse([file])
    expect(state.relativePath).toBe(SLOT_PATH)
    expect([...state.salt]).toEqual([...file.salt])
    expect(state.userDbid).toBe('1000')
    expect(state.currencies).toEqual([{ itemCid: 1000001, amount: 50 }])
    expect(state.stackables).toEqual([{ itemCid: 2000001, stackCnt: 7 }])
    expect(state.plaintextBase.length).toBeGreaterThan(0)
    expect(state.plaintextBase.length % 4096).toBe(0)
  })

  it('serialize writes mutated currency and stackables back through SQLCipher', async () => {
    const file = await makeEncryptedSlot()
    const state = await parse([file])
    state.currencies[0]!.amount = 99
    state.stackables[0]!.stackCnt = 12
    const out = await serialize(state)
    expect(out).toHaveLength(1)
    expect(out[0]!.relativePath).toBe(SLOT_PATH)
    expect([...readSalt(out[0]!.bytes)]).toEqual([...file.salt])

    const dec = decryptSqlCipher(out[0]!.bytes)
    expect(dec[20]).toBe(80)
    const db = await openSqlite(dec)
    const currency = db.exec('SELECT AMOUNT FROM tb_currency WHERE ITEM_CID = 1000001')
    const stack = db.exec('SELECT STACK_CNT FROM tb_stackable_item WHERE ITEM_CID = 2000001')
    db.close()
    expect(currency[0]?.values[0]?.[0]).toBe(99)
    expect(stack[0]?.values[0]?.[0]).toBe(12)
  })

  it('serialize emits only the slot db, never SPack sav files', async () => {
    const file = await makeEncryptedSlot()
    const state = await parse([
      file,
      { relativePath: '136330193/SPack_Slot1.sav', bytes: new Uint8Array([0x47, 0x56, 0x41, 0x53]) }
    ])
    const out = await serialize(state)
    expect(out.map((f) => f.relativePath)).toEqual([SLOT_PATH])
  })

  it('parse throws MISSING_FIELD without a slot db', async () => {
    await expect(parse([{ relativePath: '136330193/SPack_Slot1.sav', bytes: new Uint8Array([1]) }])).rejects.toMatchObject(
      { name: 'ModuleError', code: 'MISSING_FIELD' }
    )
  })

  it('parse throws DECRYPT_FAILED on garbage bytes', async () => {
    const garbage = new Uint8Array(4096)
    await expect(parse([{ relativePath: SLOT_PATH, bytes: garbage }])).rejects.toBeInstanceOf(ModuleError)
    await expect(parse([{ relativePath: SLOT_PATH, bytes: garbage }])).rejects.toMatchObject({
      code: 'DECRYPT_FAILED'
    })
  })
})
