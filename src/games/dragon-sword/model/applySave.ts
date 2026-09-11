/**
 * Apply DragonSwordState onto an open plaintext SQLite database.
 *
 * Public format references (schema/layout only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Currencies/stackables upsert. Characters, teams, equipment, and cook stacks
 * UPDATE in place so unprojected columns (HP, GEM_DBID, stat CIDs, buffs, …)
 * are preserved. tb_switch UPSERTs BIT_FIELD per category (OR recipe bits in
 * state; never DELETE unrelated categories; never blanket -1 on 0/5).
 */
import type { SqlJsDb } from '../db/sqlite'
import type { DragonSwordState } from './types'

function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function pragmaCols(db: SqlJsDb, table: string): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const result = db.exec(`PRAGMA table_info(${ident(table)})`)
    for (const row of result[0]?.values ?? []) {
      const name = row[1]
      if (typeof name === 'string' && name.length > 0) map.set(name.toUpperCase(), name)
    }
  } catch {
    /* missing table */
  }
  return map
}

function requireCols(cols: Map<string, string>, names: string[]): string[] | null {
  const actual: string[] = []
  for (const name of names) {
    const hit = cols.get(name.toUpperCase())
    if (!hit) return null
    actual.push(hit)
  }
  return actual
}

function clampTeamCid(owned: Set<number>, cid: number): number {
  if (cid === 0) return 0
  return owned.has(cid) ? cid : 0
}

export function applySave(db: SqlJsDb, state: DragonSwordState): void {
  const currencyCols = pragmaCols(db, 'tb_currency')
  const currencyNeeded = requireCols(currencyCols, ['USER_DBID', 'ITEM_CID', 'AMOUNT'])
  if (currencyNeeded) {
    const [user, itemCid, amount] = currencyNeeded
    const sql = `INSERT OR REPLACE INTO ${ident('tb_currency')} (${ident(user)}, ${ident(itemCid)}, ${ident(amount)}) VALUES (?, ?, ?)`
    for (const row of state.currencies) {
      db.run(sql, [state.userDbid, row.itemCid, row.amount])
    }
  }

  const stackCols = pragmaCols(db, 'tb_stackable_item')
  const stackNeeded = requireCols(stackCols, ['USER_DBID', 'ITEM_CID', 'STACK_CNT'])
  if (stackNeeded) {
    const [user, itemCid, stackCnt] = stackNeeded
    const sql = `INSERT OR REPLACE INTO ${ident('tb_stackable_item')} (${ident(user)}, ${ident(itemCid)}, ${ident(stackCnt)}) VALUES (?, ?, ?)`
    for (const row of state.stackables) {
      db.run(sql, [state.userDbid, row.itemCid, row.stackCnt])
    }
  }

  const charCols = pragmaCols(db, 'tb_character')
  const charNeeded = requireCols(charCols, ['USER_DBID', 'CHARACTER_CID', 'LEVEL', 'EXP', 'ASCEND'])
  if (charNeeded) {
    const [user, cid, level, exp, ascend] = charNeeded
    const sql = `UPDATE ${ident('tb_character')} SET ${ident(level)} = ?, ${ident(exp)} = ?, ${ident(ascend)} = ? WHERE ${ident(user)} = ? AND ${ident(cid)} = ?`
    for (const row of state.characters) {
      db.run(sql, [row.level, row.exp, row.ascend, state.userDbid, row.characterCid])
    }
  }

  const owned = new Set(state.characters.map((row) => row.characterCid))
  const teamCols = pragmaCols(db, 'tb_team')
  const teamNeeded = requireCols(teamCols, [
    'USER_DBID',
    'PAGE_ID',
    'SLOT1_CHARACTER_CID',
    'SLOT2_CHARACTER_CID',
    'SLOT3_CHARACTER_CID'
  ])
  if (teamNeeded) {
    const [user, pageId, s1, s2, s3] = teamNeeded
    const sql = `UPDATE ${ident('tb_team')} SET ${ident(s1)} = ?, ${ident(s2)} = ?, ${ident(s3)} = ? WHERE ${ident(user)} = ? AND ${ident(pageId)} = ?`
    for (const row of state.teams) {
      db.run(sql, [
        clampTeamCid(owned, row.slot1),
        clampTeamCid(owned, row.slot2),
        clampTeamCid(owned, row.slot3),
        state.userDbid,
        row.pageId
      ])
    }
  }

  const eqCols = pragmaCols(db, 'tb_equipment')
  const eqNeeded = requireCols(eqCols, ['ITEM_DBID', 'ENCHANT_LEVEL', 'EXP', 'IS_LOCK'])
  if (eqNeeded) {
    const [dbid, enchant, exp, lock] = eqNeeded
    const sql = `UPDATE ${ident('tb_equipment')} SET ${ident(enchant)} = ?, ${ident(exp)} = ?, ${ident(lock)} = ? WHERE CAST(${ident(dbid)} AS TEXT) = ?`
    for (const row of state.equipment) {
      db.run(sql, [row.enchantLevel, row.exp, row.isLock, row.itemDbid])
    }
  }

  const cookCols = pragmaCols(db, 'tb_cook_item')
  const cookNeeded = requireCols(cookCols, ['ITEM_DBID', 'STACK_CNT'])
  if (cookNeeded) {
    const [dbid, stack] = cookNeeded
    const sql = `UPDATE ${ident('tb_cook_item')} SET ${ident(stack)} = ? WHERE CAST(${ident(dbid)} AS TEXT) = ?`
    for (const row of state.cookItems) {
      db.run(sql, [row.stackCnt, row.itemDbid])
    }
  }

  const switchCols = pragmaCols(db, 'tb_switch')
  const switchNeeded = requireCols(switchCols, ['CATEGORY', 'BIT_FIELD'])
  if (switchNeeded) {
    const [category, bitField] = switchNeeded
    const userCol = switchCols.get('USER_DBID')
    const updateSql = userCol
      ? `UPDATE ${ident('tb_switch')} SET ${ident(bitField)} = CAST(? AS INTEGER) WHERE CAST(${ident(userCol)} AS TEXT) = ? AND ${ident(category)} = ?`
      : `UPDATE ${ident('tb_switch')} SET ${ident(bitField)} = CAST(? AS INTEGER) WHERE ${ident(category)} = ?`
    const insertSql = userCol
      ? `INSERT INTO ${ident('tb_switch')} (${ident(userCol)}, ${ident(category)}, ${ident(bitField)}) VALUES (CAST(? AS INTEGER), ?, CAST(? AS INTEGER))`
      : `INSERT INTO ${ident('tb_switch')} (${ident(category)}, ${ident(bitField)}) VALUES (?, CAST(? AS INTEGER))`
    for (const row of state.switches) {
      if (userCol) {
        db.run(updateSql, [row.bitField, state.userDbid, row.category])
        if (db.getRowsModified() === 0) {
          db.run(insertSql, [state.userDbid, row.category, row.bitField])
        }
      } else {
        db.run(updateSql, [row.bitField, row.category])
        if (db.getRowsModified() === 0) {
          db.run(insertSql, [row.category, row.bitField])
        }
      }
    }
  }
}
