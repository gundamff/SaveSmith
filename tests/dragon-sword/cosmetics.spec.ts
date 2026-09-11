import { describe, expect, it } from 'vitest'
import { exportSqlite, openSqlite, type SqlJsDb } from '../../src/games/dragon-sword/db/sqlite'
import { applySave } from '../../src/games/dragon-sword/model/applySave'
import { loadSave } from '../../src/games/dragon-sword/model/loadSave'
import type { DragonSwordState } from '../../src/games/dragon-sword/model/types'

const META = {
  relativePath: '1/1_Slot1.db',
  salt: new Uint8Array(16),
  plaintextBase: new Uint8Array(4096)
}

const COSTUME_DBID = '9007199254740993'
const VEHICLE_DBID = '9007199254740995'
const OTHER_VEHICLE_DBID = '9007199254740996'

async function makeCosmeticsDb(): Promise<SqlJsDb> {
  const db = await openSqlite(new Uint8Array())
  db.run(`CREATE TABLE tb_costume (
    COSTUME_DBID INTEGER PRIMARY KEY,
    USER_DBID INTEGER NOT NULL DEFAULT 0,
    COSTUME_CID INTEGER NOT NULL DEFAULT 0,
    EQUIP_CHARACTER_CID INTEGER NOT NULL DEFAULT 0,
    CREATED_DATE INTEGER NOT NULL DEFAULT 111
  )`)
  db.run(
    'INSERT INTO tb_costume (COSTUME_DBID, USER_DBID, COSTUME_CID, EQUIP_CHARACTER_CID, CREATED_DATE) VALUES (?, ?, ?, ?, ?)',
    [COSTUME_DBID, 1000, 4100001, 0, 555]
  )
  db.run(`CREATE TABLE tb_vehicle (
    VEHICLE_DBID INTEGER PRIMARY KEY,
    USER_DBID INTEGER NOT NULL DEFAULT 0,
    VEHICLE_CID INTEGER NOT NULL DEFAULT 0
  )`)
  db.run('INSERT INTO tb_vehicle (VEHICLE_DBID, USER_DBID, VEHICLE_CID) VALUES (?, ?, ?)', [
    VEHICLE_DBID, 1000, 5100001
  ])
  db.run(`CREATE TABLE tb_equip_mount (
    USER_DBID INTEGER NOT NULL DEFAULT 0,
    CHARACTER_CID INTEGER NOT NULL,
    VEHICLE INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (USER_DBID, CHARACTER_CID)
  )`)
  db.run('INSERT INTO tb_equip_mount (USER_DBID, CHARACTER_CID, VEHICLE) VALUES (?, ?, ?)', [
    1000, 10001, 0
  ])
  db.run(`CREATE TABLE tb_character (
    USER_DBID INTEGER NOT NULL DEFAULT 0,
    CHARACTER_CID INTEGER NOT NULL DEFAULT 0,
    LEVEL INTEGER NOT NULL DEFAULT 1,
    EXP INTEGER NOT NULL DEFAULT 0,
    ASCEND INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (USER_DBID, CHARACTER_CID)
  )`)
  db.run(
    'INSERT INTO tb_character (USER_DBID, CHARACTER_CID, LEVEL, EXP, ASCEND) VALUES (?, ?, ?, ?, ?)',
    [1000, 10001, 12, 3400, 1]
  )
  db.run(`CREATE TABLE tb_user (
    USER_DBID INTEGER PRIMARY KEY,
    REGION_CID INTEGER NOT NULL DEFAULT 0,
    SECTION_UID INTEGER NOT NULL DEFAULT 0,
    POS_X REAL NOT NULL DEFAULT 0,
    POS_Y REAL NOT NULL DEFAULT 0,
    POS_Z REAL NOT NULL DEFAULT 0,
    PLAY_TIME INTEGER NOT NULL DEFAULT 42
  )`)
  db.run(
    'INSERT INTO tb_user (USER_DBID, REGION_CID, SECTION_UID, POS_X, POS_Y, POS_Z, PLAY_TIME) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [1000, 7, 11, 1.5, 2.5, 3.5, 42]
  )
  return db
}

function loadFrom(db: SqlJsDb): DragonSwordState {
  return loadSave(db, { ...META, plaintextBase: exportSqlite(db) })
}

function count(db: SqlJsDb, table: string): number {
  const rows = db.exec(`SELECT COUNT(*) FROM ${table}`)
  return Number(rows[0]?.values[0]?.[0] ?? 0)
}

describe('cosmetics applySave', () => {
  it('keeps costume row count unchanged when UI only equips an owned costume', async () => {
    const db = await makeCosmeticsDb()
    try {
      const before = count(db, 'tb_costume')
      const state = loadFrom(db)
      expect(state.costumes).toHaveLength(1)
      const owned = state.costumes[0]
      expect(owned).toBeTruthy()
      if (owned) owned.equipCharacterCid = 10001

      applySave(db, state)

      expect(count(db, 'tb_costume')).toBe(before)
      const rows = db.exec(
        `SELECT CAST(COSTUME_DBID AS TEXT), COSTUME_CID, EQUIP_CHARACTER_CID, CREATED_DATE FROM tb_costume`
      )
      expect(rows[0]?.values).toEqual([[COSTUME_DBID, 4100001, 10001, 555]])
    } finally {
      db.close()
    }
  })

  it('does not INSERT a new costume CID that was only added in state', async () => {
    const db = await makeCosmeticsDb()
    try {
      const before = count(db, 'tb_costume')
      const state = loadFrom(db)
      state.costumes.push({
        costumeDbid: '12345',
        costumeCid: 4199999,
        equipCharacterCid: 10001
      })

      applySave(db, state)

      expect(count(db, 'tb_costume')).toBe(before)
      const cids = db.exec('SELECT COSTUME_CID FROM tb_costume ORDER BY COSTUME_CID')
      expect(cids[0]?.values).toEqual([[4100001]])
    } finally {
      db.close()
    }
  })

  it('updates tb_equip_mount.VEHICLE for existing rows and refuses new vehicle CIDs', async () => {
    const db = await makeCosmeticsDb()
    try {
      const vehicleBefore = count(db, 'tb_vehicle')
      const mountBefore = count(db, 'tb_equip_mount')
      const state = loadFrom(db)
      const mount = state.equipMounts[0]
      expect(mount).toBeTruthy()
      if (mount) mount.vehicleDbid = VEHICLE_DBID
      state.vehicles.push({ vehicleDbid: OTHER_VEHICLE_DBID, vehicleCid: 5199999 })
      state.equipMounts.push({ characterCid: 10099, vehicleDbid: VEHICLE_DBID })

      applySave(db, state)

      expect(count(db, 'tb_vehicle')).toBe(vehicleBefore)
      expect(count(db, 'tb_equip_mount')).toBe(mountBefore)
      const mounts = db.exec(
        `SELECT CHARACTER_CID, CAST(VEHICLE AS TEXT) FROM tb_equip_mount ORDER BY CHARACTER_CID`
      )
      expect(mounts[0]?.values).toEqual([[10001, VEHICLE_DBID]])
      const vehicles = db.exec('SELECT VEHICLE_CID FROM tb_vehicle')
      expect(vehicles[0]?.values).toEqual([[5100001]])
    } finally {
      db.close()
    }
  })
})

describe('world applySave', () => {
  it('updates tb_user pos and region fields already on state and leaves other columns', async () => {
    const db = await makeCosmeticsDb()
    try {
      const state = loadFrom(db)
      expect(state.user).toEqual({
        regionCid: 7,
        sectionUid: '11',
        posX: 1.5,
        posY: 2.5,
        posZ: 3.5
      })
      state.user.regionCid = 9
      state.user.sectionUid = '22'
      state.user.posX = 10
      state.user.posY = 20
      state.user.posZ = 30

      applySave(db, state)

      const rows = db.exec(
        `SELECT REGION_CID, CAST(SECTION_UID AS TEXT), POS_X, POS_Y, POS_Z, PLAY_TIME FROM tb_user`
      )
      expect(rows[0]?.values).toEqual([[9, '22', 10, 20, 30, 42]])
    } finally {
      db.close()
    }
  })
})
