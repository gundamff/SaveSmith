import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { decryptSqlCipher, encryptSqlCipher, readSalt } from '../../src/games/dragon-sword/crypto/sqlcipher'
import { exportSqlite, openSqlite, type SqlJsDb } from '../../src/games/dragon-sword/db/sqlite'
import { parse, serialize } from '../../src/games/dragon-sword/parse'

const SLOT_PATH = '136330193/136330193_Slot1.db'
const SQLCIPHER_RESERVED = 80
/** Beyond Number.MAX_SAFE_INTEGER — must round-trip as a decimal string. */
const EQUIP_DBID = '9007199254740993'

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
  db.run(`CREATE TABLE tb_character (
    USER_DBID INTEGER NOT NULL,
    CHARACTER_CID INTEGER NOT NULL,
    LEVEL INTEGER NOT NULL,
    EXP INTEGER NOT NULL,
    ASCEND INTEGER NOT NULL,
    HP INTEGER NOT NULL DEFAULT 100,
    PRIMARY KEY (USER_DBID, CHARACTER_CID)
  )`)
  db.run(`CREATE TABLE tb_team (
    USER_DBID INTEGER NOT NULL,
    PAGE_ID INTEGER NOT NULL,
    SLOT1_CHARACTER_CID INTEGER NOT NULL,
    SLOT2_CHARACTER_CID INTEGER NOT NULL,
    SLOT3_CHARACTER_CID INTEGER NOT NULL,
    PRIMARY KEY (USER_DBID, PAGE_ID)
  )`)
  db.run(`CREATE TABLE tb_equipment (
    ITEM_DBID INTEGER PRIMARY KEY,
    ITEM_CID INTEGER NOT NULL,
    ENCHANT_LEVEL INTEGER NOT NULL,
    EXP INTEGER NOT NULL,
    IS_LOCK INTEGER NOT NULL,
    MAIN_STAT_CID INTEGER NOT NULL,
    SUB_STAT_CID1 INTEGER NOT NULL,
    SUB_STAT_CID2 INTEGER NOT NULL,
    SUB_STAT_CID3 INTEGER NOT NULL,
    SUB_STAT_CID4 INTEGER NOT NULL,
    SUB_STAT_CID5 INTEGER NOT NULL,
    GEM_DBID INTEGER NOT NULL DEFAULT 0,
    DELETED_DATE TEXT NOT NULL
  )`)
  db.run('INSERT INTO tb_currency (USER_DBID, ITEM_CID, AMOUNT) VALUES (?, ?, ?)', [1000, 1000001, 50])
  db.run('INSERT INTO tb_stackable_item (USER_DBID, ITEM_CID, STACK_CNT) VALUES (?, ?, ?)', [
    1000, 2000001, 7
  ])
  db.run(
    'INSERT INTO tb_character (USER_DBID, CHARACTER_CID, LEVEL, EXP, ASCEND, HP) VALUES (?, ?, ?, ?, ?, ?)',
    [1000, 10001, 12, 3400, 1, 42]
  )
  db.run(
    'INSERT INTO tb_team (USER_DBID, PAGE_ID, SLOT1_CHARACTER_CID, SLOT2_CHARACTER_CID, SLOT3_CHARACTER_CID) VALUES (?, ?, ?, ?, ?)',
    [1000, 1, 10001, 0, 0]
  )
  db.run(
    `INSERT INTO tb_equipment (
      ITEM_DBID, ITEM_CID, ENCHANT_LEVEL, EXP, IS_LOCK,
      MAIN_STAT_CID, SUB_STAT_CID1, SUB_STAT_CID2, SUB_STAT_CID3, SUB_STAT_CID4, SUB_STAT_CID5,
      GEM_DBID, DELETED_DATE
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [EQUIP_DBID, 3000001, 3, 80, 1, 501, 601, 602, 0, 0, 0, 77, '0']
  )
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
    expect(state.characters).toEqual([{ characterCid: 10001, level: 12, exp: 3400, ascend: 1 }])
    expect(state.teams).toEqual([{ pageId: 1, slot1: 10001, slot2: 0, slot3: 0 }])
    expect(state.equipment).toEqual([
      {
        itemDbid: EQUIP_DBID,
        itemCid: 3000001,
        enchantLevel: 3,
        exp: 80,
        isLock: 1,
        deletedDate: '0',
        mainStatCid: 501,
        subStatCid1: 601,
        subStatCid2: 602,
        subStatCid3: 0,
        subStatCid4: 0,
        subStatCid5: 0
      }
    ])
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

  it('serialize writes character LEVEL and equipment ENCHANT_LEVEL without wiping other columns', async () => {
    const file = await makeEncryptedSlot()
    const state = await parse([file])
    state.characters[0]!.level = 40
    state.characters[0]!.exp = 9001
    state.characters[0]!.ascend = 2
    state.equipment[0]!.enchantLevel = 9
    state.equipment[0]!.exp = 250
    state.equipment[0]!.isLock = 0
    const out = await serialize(state)
    const db = await openSqlite(decryptSqlCipher(out[0]!.bytes))
    const character = db.exec(
      'SELECT LEVEL, EXP, ASCEND, HP FROM tb_character WHERE CHARACTER_CID = 10001'
    )
    const equipment = db.exec(
      `SELECT ENCHANT_LEVEL, EXP, IS_LOCK, MAIN_STAT_CID, GEM_DBID, CAST(ITEM_DBID AS TEXT) FROM tb_equipment`
    )
    db.close()
    expect(character[0]?.values[0]).toEqual([40, 9001, 2, 42])
    expect(equipment[0]?.values[0]).toEqual([9, 250, 0, 501, 77, EQUIP_DBID])
  })

  it('serialize clamps team slots to owned character CIDs or 0', async () => {
    const file = await makeEncryptedSlot()
    const state = await parse([file])
    state.teams[0]!.slot1 = 99999
    state.teams[0]!.slot2 = 10001
    state.teams[0]!.slot3 = 0
    const out = await serialize(state)
    const db = await openSqlite(decryptSqlCipher(out[0]!.bytes))
    const team = db.exec('SELECT SLOT1_CHARACTER_CID, SLOT2_CHARACTER_CID, SLOT3_CHARACTER_CID FROM tb_team')
    db.close()
    expect(team[0]?.values[0]).toEqual([0, 10001, 0])
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
