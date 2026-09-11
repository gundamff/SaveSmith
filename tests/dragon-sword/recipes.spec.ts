import { describe, expect, it } from 'vitest'
import { exportSqlite, openSqlite, type SqlJsDb } from '../../src/games/dragon-sword/db/sqlite'
import { applySave } from '../../src/games/dragon-sword/model/applySave'
import { loadSave } from '../../src/games/dragon-sword/model/loadSave'
import { isActiveCookRow, recipeBit, recipeKnown, setRecipeKnown } from '../../src/games/dragon-sword/model/recipes'
import { hasBit } from '../../src/games/dragon-sword/model/bitmask'
import type { DragonSwordState } from '../../src/games/dragon-sword/model/types'

const META = {
  relativePath: '1/1_Slot1.db',
  salt: new Uint8Array(16),
  plaintextBase: new Uint8Array(4096)
}

async function makeCookSwitchDb(): Promise<SqlJsDb> {
  const db = await openSqlite(new Uint8Array())
  db.run(`CREATE TABLE tb_cook_item (
    USER_DBID INTEGER NOT NULL,
    ITEM_DBID INTEGER NOT NULL,
    ITEM_CID INTEGER NOT NULL,
    STACK_CNT INTEGER NOT NULL,
    SPECIAL_BUFF_CID1 INTEGER NOT NULL DEFAULT 0,
    DELETED_DATE TEXT NOT NULL,
    PRIMARY KEY (USER_DBID, ITEM_DBID)
  )`)
  db.run(`CREATE TABLE tb_switch (
    USER_DBID INTEGER,
    CATEGORY INTEGER,
    BIT_FIELD INTEGER,
    PRIMARY KEY (USER_DBID, CATEGORY)
  )`)
  db.run(
    `INSERT INTO tb_cook_item (USER_DBID, ITEM_DBID, ITEM_CID, STACK_CNT, SPECIAL_BUFF_CID1, DELETED_DATE)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [1000, 111, 1420101, 3, 9, '0']
  )
  db.run(
    `INSERT INTO tb_cook_item (USER_DBID, ITEM_DBID, ITEM_CID, STACK_CNT, SPECIAL_BUFF_CID1, DELETED_DATE)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [1000, 222, 1420102, 5, 8, '1']
  )
  db.run('INSERT INTO tb_switch (USER_DBID, CATEGORY, BIT_FIELD) VALUES (?, ?, ?)', [1000, 0, 3])
  db.run('INSERT INTO tb_switch (USER_DBID, CATEGORY, BIT_FIELD) VALUES (?, ?, ?)', [1000, 5, 7])
  db.run('INSERT INTO tb_switch (USER_DBID, CATEGORY, BIT_FIELD) VALUES (?, ?, ?)', [1000, 15, 1])
  db.run('INSERT INTO tb_switch (USER_DBID, CATEGORY, BIT_FIELD) VALUES (?, ?, ?)', [1000, 99, 42])
  return db
}

function loadFrom(db: SqlJsDb): DragonSwordState {
  return loadSave(db, { ...META, plaintextBase: exportSqlite(db) })
}

function bitField(db: SqlJsDb, category: number): string {
  const rows = db.exec(
    `SELECT CAST(BIT_FIELD AS TEXT) FROM tb_switch WHERE CATEGORY = ${category}`
  )
  return String(rows[0]?.values[0]?.[0] ?? '')
}

describe('recipe switchKey bit mapping', () => {
  it('maps switchKey 1002 to category 15 bit 42', () => {
    expect(recipeBit(1002)).toEqual({ category: 15, bit: 42 })
  })
})

describe('cook row active filter', () => {
  it('treats 0 / "0" as active and hides non-zero DELETED_DATE', () => {
    expect(isActiveCookRow('0')).toBe(true)
    expect(isActiveCookRow('1')).toBe(false)
    expect(isActiveCookRow('1710000000')).toBe(false)
  })
})

describe('recipe unlock round-trip', () => {
  it('ORs recipe bit 1002 onto category 15 without wiping other categories or cook extras', async () => {
    const db = await makeCookSwitchDb()
    try {
      const state = loadFrom(db)
      expect(recipeKnown(state.switches, 1002)).toBe(false)
      const active = state.cookItems.find((row) => isActiveCookRow(row.deletedDate))
      const deleted = state.cookItems.find((row) => !isActiveCookRow(row.deletedDate))
      expect(active?.stackCnt).toBe(3)
      expect(deleted?.stackCnt).toBe(5)

      if (active) active.stackCnt = 12
      setRecipeKnown(state.switches, 1002, true)
      state.switches = state.switches.filter((row) => row.category !== 99)
      applySave(db, state)

      const cook = db.exec(
        `SELECT STACK_CNT, SPECIAL_BUFF_CID1, DELETED_DATE FROM tb_cook_item ORDER BY ITEM_DBID`
      )
      expect(cook[0]?.values).toEqual([
        [12, 9, '0'],
        [5, 8, '1']
      ])

      const cat15 = bitField(db, 15)
      expect(hasBit(cat15, 0)).toBe(true)
      expect(hasBit(cat15, 42)).toBe(true)
      expect(bitField(db, 0)).toBe('3')
      expect(bitField(db, 5)).toBe('7')
      expect(bitField(db, 99)).toBe('42')
      expect(bitField(db, 0)).not.toBe('-1')
      expect(bitField(db, 5)).not.toBe('-1')
    } finally {
      db.close()
    }
  })

  it('locks switchKey 1002 by clearing bit 42 and leaves unrelated categories intact', async () => {
    const db = await makeCookSwitchDb()
    try {
      const state = loadFrom(db)
      setRecipeKnown(state.switches, 1002, true)
      applySave(db, state)
      expect(recipeKnown(loadFrom(db).switches, 1002)).toBe(true)

      setRecipeKnown(state.switches, 1002, false)
      applySave(db, state)

      const cat15 = bitField(db, 15)
      expect(hasBit(cat15, 42)).toBe(false)
      expect(hasBit(cat15, 0)).toBe(true)
      expect(bitField(db, 0)).toBe('3')
      expect(bitField(db, 5)).toBe('7')
    } finally {
      db.close()
    }
  })
})
