import { describe, expect, it } from 'vitest'
import { exportSqlite, openSqlite, type SqlJsDb } from '../../src/games/dragon-sword/db/sqlite'
import { applySave } from '../../src/games/dragon-sword/model/applySave'
import { loadSave } from '../../src/games/dragon-sword/model/loadSave'
import { isEarnableCharacter } from '../../src/games/dragon-sword/model/characters'
import type { DragonSwordState } from '../../src/games/dragon-sword/model/types'

const META = {
  relativePath: '1/1_Slot1.db',
  salt: new Uint8Array(16),
  plaintextBase: new Uint8Array(4096)
}

const KARMA_DBID = '9007199254740993'
const OTHER_DBID = '9007199254740994'

async function makeKarmaDb(): Promise<SqlJsDb> {
  const db = await openSqlite(new Uint8Array())
  db.run(`CREATE TABLE tb_karma (
    ITEM_DBID INTEGER PRIMARY KEY,
    USER_DBID INTEGER NOT NULL DEFAULT 0,
    ITEM_CID INTEGER NOT NULL DEFAULT 0,
    IS_LOCK INTEGER NOT NULL DEFAULT 0,
    EXP INTEGER NOT NULL DEFAULT 0,
    ASCEND INTEGER NOT NULL DEFAULT 0,
    TRANSCEND INTEGER NOT NULL DEFAULT 0,
    CREATED_DATE INTEGER NOT NULL DEFAULT 111,
    DELETED_DATE INTEGER NOT NULL DEFAULT 0
  )`)
  db.run(
    `INSERT INTO tb_karma (ITEM_DBID, USER_DBID, ITEM_CID, IS_LOCK, EXP, ASCEND, TRANSCEND, CREATED_DATE, DELETED_DATE)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [KARMA_DBID, 1000, 1710501, 0, 10, 1, 2, 555, 0]
  )
  db.run(
    `INSERT INTO tb_karma (ITEM_DBID, USER_DBID, ITEM_CID, IS_LOCK, EXP, ASCEND, TRANSCEND, CREATED_DATE, DELETED_DATE)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [OTHER_DBID, 1000, 1710502, 1, 20, 2, 3, 666, 1]
  )
  db.run(`CREATE TABLE tb_character (
    USER_DBID INTEGER NOT NULL DEFAULT 0,
    CHARACTER_CID INTEGER NOT NULL DEFAULT 0,
    LEVEL INTEGER NOT NULL DEFAULT 1,
    EXP INTEGER NOT NULL DEFAULT 0,
    ASCEND INTEGER NOT NULL DEFAULT 1,
    HP INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (USER_DBID, CHARACTER_CID)
  )`)
  db.run(
    'INSERT INTO tb_character (USER_DBID, CHARACTER_CID, LEVEL, EXP, ASCEND, HP) VALUES (?, ?, ?, ?, ?, ?)',
    [1000, 10001, 12, 3400, 1, 42]
  )
  return db
}

function loadFrom(db: SqlJsDb): DragonSwordState {
  return loadSave(db, { ...META, plaintextBase: exportSqlite(db) })
}

describe('karma projection', () => {
  it('loads pinned numeric columns and keeps ITEM_DBID as a decimal string', async () => {
    const db = await makeKarmaDb()
    try {
      const state = loadFrom(db)
      expect(state.karma).toEqual([
        {
          itemDbid: KARMA_DBID,
          itemCid: 1710501,
          isLock: 0,
          exp: 10,
          ascend: 1,
          transcend: 2,
          deletedDate: 0
        },
        {
          itemDbid: OTHER_DBID,
          itemCid: 1710502,
          isLock: 1,
          exp: 20,
          ascend: 2,
          transcend: 3,
          deletedDate: 1
        }
      ])
    } finally {
      db.close()
    }
  })
})

describe('karma applySave', () => {
  it('UPDATEs EXP/ASCEND/TRANSCEND/IS_LOCK in place and leaves CREATED_DATE and deleted rows', async () => {
    const db = await makeKarmaDb()
    try {
      const state = loadFrom(db)
      const active = state.karma.find((row) => row.deletedDate === 0)
      const deleted = state.karma.find((row) => row.deletedDate !== 0)
      expect(active).toBeTruthy()
      if (active) {
        active.exp = 99
        active.ascend = 4
        active.transcend = 5
        active.isLock = 1
      }
      if (deleted) deleted.exp = 999

      applySave(db, state)

      const rows = db.exec(
        `SELECT CAST(ITEM_DBID AS TEXT), ITEM_CID, IS_LOCK, EXP, ASCEND, TRANSCEND, CREATED_DATE, DELETED_DATE
         FROM tb_karma ORDER BY ITEM_DBID`
      )
      expect(rows[0]?.values).toEqual([
        [KARMA_DBID, 1710501, 1, 99, 4, 5, 555, 0],
        [OTHER_DBID, 1710502, 1, 999, 2, 3, 666, 1]
      ])
    } finally {
      db.close()
    }
  })
})

describe('character catalog earnable guard', () => {
  it('treats every CID as not earnable while characters.json is an empty stub', () => {
    expect(isEarnableCharacter(10001)).toBe(false)
    expect(isEarnableCharacter(10040)).toBe(false)
  })

  it('does not INSERT a new tb_character row when the catalog is empty', async () => {
    const db = await makeKarmaDb()
    try {
      const state = loadFrom(db)
      state.characters.push({ characterCid: 10099, level: 1, exp: 0, ascend: 0 })
      applySave(db, state)
      const rows = db.exec('SELECT CHARACTER_CID FROM tb_character ORDER BY CHARACTER_CID')
      expect(rows[0]?.values).toEqual([[10001]])
    } finally {
      db.close()
    }
  })
})
