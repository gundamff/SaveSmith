/**
 * Apply DragonSwordState onto an open plaintext SQLite database.
 *
 * Public format references (schema/layout only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Currencies/stackables upsert. Characters, teams, equipment, cook stacks,
 * karma, costumes, mounts, and user pos UPDATE in place so unprojected columns
 * (HP, GEM_DBID, dates, PLAY_TIME, …) stay. tb_switch UPSERTs BIT_FIELD per
 * category. tb_title UPSERTs BIT_FIELD only (never INSERT OR REPLACE — that
 * would wipe FAV_BIT_FIELD). New characters INSERT only when the catalog marks
 * the CID earnable. Costumes/vehicles never INSERT in phase 1.
 */
import type { SqlJsDb } from '../db/sqlite'
import { isEarnableCharacter } from './characters'
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
    const updateSql = `UPDATE ${ident('tb_character')} SET ${ident(level)} = ?, ${ident(exp)} = ?, ${ident(ascend)} = ? WHERE ${ident(user)} = ? AND ${ident(cid)} = ?`
    const insertSql = `INSERT INTO ${ident('tb_character')} (${ident(user)}, ${ident(cid)}, ${ident(level)}, ${ident(exp)}, ${ident(ascend)}) VALUES (?, ?, ?, ?, ?)`
    for (const row of state.characters) {
      db.run(updateSql, [row.level, row.exp, row.ascend, state.userDbid, row.characterCid])
      if (db.getRowsModified() === 0 && isEarnableCharacter(row.characterCid)) {
        db.run(insertSql, [state.userDbid, row.characterCid, row.level, row.exp, row.ascend])
      }
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

  const titleCols = pragmaCols(db, 'tb_title')
  const titleNeeded = requireCols(titleCols, ['CATEGORY', 'BIT_FIELD'])
  if (titleNeeded) {
    const [category, bitField] = titleNeeded
    const userCol = titleCols.get('USER_DBID')
    const updateSql = userCol
      ? `UPDATE ${ident('tb_title')} SET ${ident(bitField)} = CAST(? AS INTEGER) WHERE CAST(${ident(userCol)} AS TEXT) = ? AND ${ident(category)} = ?`
      : `UPDATE ${ident('tb_title')} SET ${ident(bitField)} = CAST(? AS INTEGER) WHERE ${ident(category)} = ?`
    const insertSql = userCol
      ? `INSERT INTO ${ident('tb_title')} (${ident(userCol)}, ${ident(category)}, ${ident(bitField)}) VALUES (CAST(? AS INTEGER), ?, CAST(? AS INTEGER))`
      : `INSERT INTO ${ident('tb_title')} (${ident(category)}, ${ident(bitField)}) VALUES (?, CAST(? AS INTEGER))`
    for (const row of state.titles) {
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

  const karmaCols = pragmaCols(db, 'tb_karma')
  const karmaNeeded = requireCols(karmaCols, ['ITEM_DBID', 'IS_LOCK', 'EXP', 'ASCEND', 'TRANSCEND'])
  if (karmaNeeded) {
    const [dbid, lock, exp, ascend, transcend] = karmaNeeded
    const sql = `UPDATE ${ident('tb_karma')} SET ${ident(lock)} = ?, ${ident(exp)} = ?, ${ident(ascend)} = ?, ${ident(transcend)} = ? WHERE CAST(${ident(dbid)} AS TEXT) = ?`
    for (const row of state.karma) {
      db.run(sql, [row.isLock, row.exp, row.ascend, row.transcend, row.itemDbid])
    }
  }

  const costumeCols = pragmaCols(db, 'tb_costume')
  const costumeNeeded = requireCols(costumeCols, ['COSTUME_DBID', 'EQUIP_CHARACTER_CID'])
  if (costumeNeeded) {
    const [dbid, equip] = costumeNeeded
    const sql = `UPDATE ${ident('tb_costume')} SET ${ident(equip)} = ? WHERE CAST(${ident(dbid)} AS TEXT) = ?`
    for (const row of state.costumes) {
      const cid = row.equipCharacterCid !== 0 && owned.has(row.equipCharacterCid) ? row.equipCharacterCid : 0
      db.run(sql, [cid, row.costumeDbid])
    }
  }

  const ownedVehicles = new Set(state.vehicles.map((row) => row.vehicleDbid))
  const mountCols = pragmaCols(db, 'tb_equip_mount')
  const mountNeeded = requireCols(mountCols, ['CHARACTER_CID', 'VEHICLE'])
  if (mountNeeded) {
    const [cid, vehicle] = mountNeeded
    const userCol = mountCols.get('USER_DBID')
    const sql = userCol
      ? `UPDATE ${ident('tb_equip_mount')} SET ${ident(vehicle)} = ? WHERE ${ident(cid)} = ? AND CAST(${ident(userCol)} AS TEXT) = ?`
      : `UPDATE ${ident('tb_equip_mount')} SET ${ident(vehicle)} = ? WHERE ${ident(cid)} = ?`
    for (const row of state.equipMounts) {
      const dbid = row.vehicleDbid !== '0' && ownedVehicles.has(row.vehicleDbid) ? row.vehicleDbid : '0'
      if (userCol) db.run(sql, [dbid, row.characterCid, state.userDbid])
      else db.run(sql, [dbid, row.characterCid])
    }
  }

  const userCols = pragmaCols(db, 'tb_user')
  const userNeeded = requireCols(userCols, ['REGION_CID', 'SECTION_UID', 'POS_X', 'POS_Y', 'POS_Z'])
  if (userNeeded) {
    const [region, section, x, y, z] = userNeeded
    const userCol = userCols.get('USER_DBID')
    if (userCol) {
      db.run(
        `UPDATE ${ident('tb_user')} SET ${ident(region)} = ?, ${ident(section)} = ?, ${ident(x)} = ?, ${ident(y)} = ?, ${ident(z)} = ? WHERE CAST(${ident(userCol)} AS TEXT) = ?`,
        [state.user.regionCid, state.user.sectionUid, state.user.posX, state.user.posY, state.user.posZ, state.userDbid]
      )
    } else {
      db.run(
        `UPDATE ${ident('tb_user')} SET ${ident(region)} = ?, ${ident(section)} = ?, ${ident(x)} = ?, ${ident(y)} = ?, ${ident(z)} = ?`,
        [state.user.regionCid, state.user.sectionUid, state.user.posX, state.user.posY, state.user.posZ]
      )
    }
  }
}
