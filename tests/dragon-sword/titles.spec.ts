import { describe, expect, it } from 'vitest'
import { exportSqlite, openSqlite, type SqlJsDb } from '../../src/games/dragon-sword/db/sqlite'
import { applySave } from '../../src/games/dragon-sword/model/applySave'
import { loadSave } from '../../src/games/dragon-sword/model/loadSave'
import { hasBit } from '../../src/games/dragon-sword/model/bitmask'
import { setTitleKnown, titleBit, titleKnown } from '../../src/games/dragon-sword/model/titles'
import type { DragonSwordState } from '../../src/games/dragon-sword/model/types'

const META = {
  relativePath: '1/1_Slot1.db',
  salt: new Uint8Array(16),
  plaintextBase: new Uint8Array(4096)
}

const TITLE_ID = 2100000
const FAV_SENTINEL = '99'

async function makeTitleDb(): Promise<SqlJsDb> {
  const db = await openSqlite(new Uint8Array())
  db.run(`CREATE TABLE tb_title (
    USER_DBID INTEGER NOT NULL,
    CATEGORY INTEGER NOT NULL,
    BIT_FIELD INTEGER DEFAULT 0,
    FAV_BIT_FIELD INTEGER DEFAULT 0,
    PRIMARY KEY (USER_DBID, CATEGORY)
  )`)
  db.run('INSERT INTO tb_title (USER_DBID, CATEGORY, BIT_FIELD, FAV_BIT_FIELD) VALUES (?, ?, ?, ?)', [
    1000, 32812, 1, Number(FAV_SENTINEL)
  ])
  db.run('INSERT INTO tb_title (USER_DBID, CATEGORY, BIT_FIELD, FAV_BIT_FIELD) VALUES (?, ?, ?, ?)', [
    1000, 32876, 8, 7
  ])
  return db
}

function loadFrom(db: SqlJsDb): DragonSwordState {
  return loadSave(db, { ...META, plaintextBase: exportSqlite(db) })
}

function col(db: SqlJsDb, category: number, name: 'BIT_FIELD' | 'FAV_BIT_FIELD'): string {
  const rows = db.exec(
    `SELECT CAST(${name} AS TEXT) FROM tb_title WHERE CATEGORY = ${category}`
  )
  return String(rows[0]?.values[0]?.[0] ?? '')
}

describe('title id bit mapping', () => {
  it('maps title id 2100000 to category 32812 bit 32', () => {
    expect(titleBit(TITLE_ID)).toEqual({ category: 32812, bit: 32 })
  })
})

describe('title bitmask UPSERT preserves fav', () => {
  it('ORs title 2100000 onto BIT_FIELD and leaves FAV_BIT_FIELD untouched', async () => {
    const db = await makeTitleDb()
    try {
      const state = loadFrom(db)
      expect(titleKnown(state.titles, TITLE_ID)).toBe(false)
      const row = state.titles.find((t) => t.category === 32812)
      expect(row?.favBitField).toBe(FAV_SENTINEL)

      setTitleKnown(state.titles, TITLE_ID, true)
      const mutated = state.titles.find((t) => t.category === 32812)
      if (mutated) mutated.favBitField = '0'

      applySave(db, state)

      const bits = col(db, 32812, 'BIT_FIELD')
      expect(hasBit(bits, 0)).toBe(true)
      expect(hasBit(bits, 32)).toBe(true)
      expect(col(db, 32812, 'FAV_BIT_FIELD')).toBe(FAV_SENTINEL)
      expect(col(db, 32876, 'FAV_BIT_FIELD')).toBe('7')
      expect(col(db, 32876, 'BIT_FIELD')).toBe('8')
    } finally {
      db.close()
    }
  })

  it('inserts a missing title category with BIT_FIELD only so fav defaults to 0', async () => {
    const db = await makeTitleDb()
    try {
      const state = loadFrom(db)
      setTitleKnown(state.titles, 2100128, true)
      applySave(db, state)

      const { category, bit } = titleBit(2100128)
      expect(hasBit(col(db, category, 'BIT_FIELD'), bit)).toBe(true)
      expect(col(db, category, 'FAV_BIT_FIELD')).toBe('0')
      expect(col(db, 32812, 'FAV_BIT_FIELD')).toBe(FAV_SENTINEL)
    } finally {
      db.close()
    }
  })
})
