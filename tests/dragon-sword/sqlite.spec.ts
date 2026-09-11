import { describe, expect, it } from 'vitest'
import { exportSqlite, integrityCheck, openSqlite } from '../../src/games/dragon-sword/db/sqlite'

const PAGE_SIZE = 4096

describe('sqlite helpers', () => {
  it('creates an in-memory DB, exports, reopens, and SELECTs', async () => {
    const db = await openSqlite(new Uint8Array())
    db.run('CREATE TABLE item (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
    db.run('INSERT INTO item (id, name) VALUES (?, ?)', [1, 'sword'])
    integrityCheck(db)
    const exported = exportSqlite(db)
    db.close()

    expect(exported.length).toBeGreaterThan(0)
    expect(exported.length % PAGE_SIZE).toBe(0)

    const reopened = await openSqlite(exported)
    const rows = reopened.exec('SELECT id, name FROM item')
    expect(rows[0]?.values).toEqual([[1, 'sword']])
    integrityCheck(reopened)
    reopened.close()
  })

  it('integrityCheck throws when the database is not ok', async () => {
    const db = await openSqlite(new Uint8Array())
    db.run('CREATE TABLE t (x INTEGER)')
    const exported = exportSqlite(db)
    db.close()

    const corrupted = new Uint8Array(exported)
    for (let i = 100; i < 200 && i < corrupted.length; i++) {
      corrupted[i] ^= 0xff
    }

    const broken = await openSqlite(corrupted)
    expect(() => integrityCheck(broken)).toThrow(/integrity/i)
    broken.close()
  })
})
