/**
 * Apply DragonSwordState onto an open plaintext SQLite database.
 *
 * Public format references (schema/layout only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Phase-1 skeleton: currencies + stackables upsert. Other tables stay as in plaintextBase.
 */
import type { SqlJsDb } from '../db/sqlite'
import type { DragonSwordState } from './types'

function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function pragmaCols(db: SqlJsDb, table: string): Set<string> {
  const names = new Set<string>()
  try {
    const result = db.exec(`PRAGMA table_info(${ident(table)})`)
    for (const row of result[0]?.values ?? []) {
      const name = row[1]
      if (typeof name === 'string' && name.length > 0) names.add(name.toUpperCase())
    }
  } catch {
    /* missing table */
  }
  return names
}

function hasCols(cols: Set<string>, names: string[]): boolean {
  return names.every((n) => cols.has(n.toUpperCase()))
}

export function applySave(db: SqlJsDb, state: DragonSwordState): void {
  const currencyCols = pragmaCols(db, 'tb_currency')
  if (hasCols(currencyCols, ['USER_DBID', 'ITEM_CID', 'AMOUNT'])) {
    const sql = `INSERT OR REPLACE INTO ${ident('tb_currency')} (${ident('USER_DBID')}, ${ident('ITEM_CID')}, ${ident('AMOUNT')}) VALUES (?, ?, ?)`
    for (const row of state.currencies) {
      db.run(sql, [state.userDbid, row.itemCid, row.amount])
    }
  }

  const stackCols = pragmaCols(db, 'tb_stackable_item')
  if (hasCols(stackCols, ['USER_DBID', 'ITEM_CID', 'STACK_CNT'])) {
    const sql = `INSERT OR REPLACE INTO ${ident('tb_stackable_item')} (${ident('USER_DBID')}, ${ident('ITEM_CID')}, ${ident('STACK_CNT')}) VALUES (?, ?, ?)`
    for (const row of state.stackables) {
      db.run(sql, [state.userDbid, row.itemCid, row.stackCnt])
    }
  }
}
