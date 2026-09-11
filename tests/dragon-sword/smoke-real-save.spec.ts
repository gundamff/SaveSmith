/**
 * Optional local smoke against a real DragonSword slot db.
 * Set DSA_TEST_SAVE to a copy path; CI leaves it unset and skips.
 * Never commit real save files.
 */
import { copyFile, mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { describe, expect, it } from 'vitest'
import { decryptSqlCipher } from '../../src/games/dragon-sword/crypto/sqlcipher'
import { openSqlite } from '../../src/games/dragon-sword/db/sqlite'
import { parse, serialize } from '../../src/games/dragon-sword/parse'

const savePath = process.env.DSA_TEST_SAVE

describe.skipIf(!savePath)('dragon-sword real-save smoke (local only)', () => {
  it('parse → bump currency +1 → serialize → decrypt → SELECT matches', async () => {
    const src = savePath!
    const workDir = await mkdtemp(join(tmpdir(), 'dsa-smoke-'))
    try {
      const workCopy = join(workDir, basename(src))
      await copyFile(src, workCopy)

      const bytes = new Uint8Array(await readFile(workCopy))
      const relativePath = `136330193/${basename(src)}`

      const state = await parse([{ relativePath, bytes }])
      expect(state.currencies.length).toBeGreaterThan(0)

      const row = state.currencies[0]!
      const before = row.amount
      row.amount = before + 1

      const out = await serialize(state)
      expect(out).toHaveLength(1)

      const db = await openSqlite(decryptSqlCipher(out[0]!.bytes))
      try {
        const result = db.exec(
          `SELECT AMOUNT FROM tb_currency WHERE USER_DBID = ${state.userDbid} AND ITEM_CID = ${row.itemCid}`
        )
        expect(result[0]?.values[0]?.[0]).toBe(before + 1)
      } finally {
        db.close()
      }
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
  })
})
