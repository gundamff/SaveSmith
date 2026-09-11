/**
 * Project a decrypted DragonSword SQLite image onto DragonSwordState.
 *
 * Public format references (schema/layout only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Unknown tables/columns (via PRAGMA table_info) yield empty arrays — no guessing.
 */
import type { SqlJsDb } from '../db/sqlite'
import type {
  CharacterRow,
  CookItemRow,
  CostumeRow,
  CurrencyRow,
  DragonSwordState,
  EquipMountRow,
  EquipmentRow,
  StackableRow,
  SwitchRow,
  TeamRow,
  KarmaRow,
  TitleRow,
  UserRow,
  VehicleRow
} from './types'

interface LoadMeta {
  relativePath: string
  salt: Uint8Array
  plaintextBase: Uint8Array
}

type ColMap = Map<string, string>

function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function pragmaCols(db: SqlJsDb, table: string): ColMap {
  const map: ColMap = new Map()
  try {
    const result = db.exec(`PRAGMA table_info(${ident(table)})`)
    for (const row of result[0]?.values ?? []) {
      const name = row[1]
      if (typeof name === 'string' && name.length > 0) {
        map.set(name.toUpperCase(), name)
      }
    }
  } catch {
    /* missing / unreadable table */
  }
  return map
}

function requireCols(cols: ColMap, names: string[]): string[] | null {
  const actual: string[] = []
  for (const name of names) {
    const hit = cols.get(name.toUpperCase())
    if (!hit) return null
    actual.push(hit)
  }
  return actual
}

function query(db: SqlJsDb, sql: string): unknown[][] {
  try {
    return db.exec(sql)[0]?.values ?? []
  } catch {
    return []
  }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  if (typeof value === 'bigint') return value.toString()
  if (value == null) return '0'
  return String(value)
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.length > 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function textExpr(col: string): string {
  return `CAST(${ident(col)} AS TEXT)`
}

function loadCurrencies(db: SqlJsDb): { userDbid: string | null; rows: CurrencyRow[] } {
  const cols = pragmaCols(db, 'tb_currency')
  const needed = requireCols(cols, ['ITEM_CID', 'AMOUNT'])
  if (!needed) return { userDbid: null, rows: [] }
  const [itemCid, amount] = needed
  const userCol = cols.get('USER_DBID')
  const sql = userCol
    ? `SELECT ${textExpr(userCol)}, ${ident(itemCid)}, ${ident(amount)} FROM ${ident('tb_currency')}`
    : `SELECT '0', ${ident(itemCid)}, ${ident(amount)} FROM ${ident('tb_currency')}`
  const rows: CurrencyRow[] = []
  let userDbid: string | null = null
  for (const row of query(db, sql)) {
    if (userDbid == null) userDbid = asString(row[0])
    rows.push({ itemCid: asNumber(row[1]), amount: asNumber(row[2]) })
  }
  return { userDbid, rows }
}

function loadStackables(db: SqlJsDb): { userDbid: string | null; rows: StackableRow[] } {
  const cols = pragmaCols(db, 'tb_stackable_item')
  const needed = requireCols(cols, ['ITEM_CID', 'STACK_CNT'])
  if (!needed) return { userDbid: null, rows: [] }
  const [itemCid, stackCnt] = needed
  const userCol = cols.get('USER_DBID')
  const sql = userCol
    ? `SELECT ${textExpr(userCol)}, ${ident(itemCid)}, ${ident(stackCnt)} FROM ${ident('tb_stackable_item')}`
    : `SELECT '0', ${ident(itemCid)}, ${ident(stackCnt)} FROM ${ident('tb_stackable_item')}`
  const rows: StackableRow[] = []
  let userDbid: string | null = null
  for (const row of query(db, sql)) {
    if (userDbid == null) userDbid = asString(row[0])
    rows.push({ itemCid: asNumber(row[1]), stackCnt: asNumber(row[2]) })
  }
  return { userDbid, rows }
}

function loadCharacters(db: SqlJsDb): CharacterRow[] {
  const cols = pragmaCols(db, 'tb_character')
  const needed = requireCols(cols, ['CHARACTER_CID', 'LEVEL', 'EXP', 'ASCEND'])
  if (!needed) return []
  const [cid, level, exp, ascend] = needed
  const sql = `SELECT ${ident(cid)}, ${ident(level)}, ${ident(exp)}, ${ident(ascend)} FROM ${ident('tb_character')}`
  return query(db, sql).map((row) => ({
    characterCid: asNumber(row[0]),
    level: asNumber(row[1]),
    exp: asNumber(row[2]),
    ascend: asNumber(row[3])
  }))
}

function loadTeams(db: SqlJsDb): TeamRow[] {
  const cols = pragmaCols(db, 'tb_team')
  const needed = requireCols(cols, ['PAGE_ID', 'SLOT1_CHARACTER_CID', 'SLOT2_CHARACTER_CID', 'SLOT3_CHARACTER_CID'])
  if (!needed) return []
  const [pageId, s1, s2, s3] = needed
  const sql = `SELECT ${ident(pageId)}, ${ident(s1)}, ${ident(s2)}, ${ident(s3)} FROM ${ident('tb_team')}`
  return query(db, sql).map((row) => ({
    pageId: asNumber(row[0]),
    slot1: asNumber(row[1]),
    slot2: asNumber(row[2]),
    slot3: asNumber(row[3])
  }))
}

function loadEquipment(db: SqlJsDb): EquipmentRow[] {
  const cols = pragmaCols(db, 'tb_equipment')
  const needed = requireCols(cols, ['ITEM_DBID', 'ITEM_CID', 'ENCHANT_LEVEL', 'EXP', 'IS_LOCK', 'DELETED_DATE'])
  if (!needed) return []
  const [dbid, cid, enchant, exp, lock, deleted] = needed
  const statNames = ['MAIN_STAT_CID', 'SUB_STAT_CID1', 'SUB_STAT_CID2', 'SUB_STAT_CID3', 'SUB_STAT_CID4', 'SUB_STAT_CID5']
  const statSelect = statNames.map((name) => {
    const hit = cols.get(name)
    return hit ? ident(hit) : '0'
  })
  const sql = `SELECT ${textExpr(dbid)}, ${ident(cid)}, ${ident(enchant)}, ${ident(exp)}, ${ident(lock)}, ${textExpr(deleted)}, ${statSelect.join(', ')} FROM ${ident('tb_equipment')}`
  return query(db, sql).map((row) => ({
    itemDbid: asString(row[0]),
    itemCid: asNumber(row[1]),
    enchantLevel: asNumber(row[2]),
    exp: asNumber(row[3]),
    isLock: asNumber(row[4]),
    deletedDate: asString(row[5]),
    mainStatCid: asNumber(row[6]),
    subStatCid1: asNumber(row[7]),
    subStatCid2: asNumber(row[8]),
    subStatCid3: asNumber(row[9]),
    subStatCid4: asNumber(row[10]),
    subStatCid5: asNumber(row[11])
  }))
}

function loadCookItems(db: SqlJsDb): CookItemRow[] {
  const cols = pragmaCols(db, 'tb_cook_item')
  const needed = requireCols(cols, ['ITEM_DBID', 'ITEM_CID', 'STACK_CNT', 'DELETED_DATE'])
  if (!needed) return []
  const [dbid, cid, stack, deleted] = needed
  const sql = `SELECT ${textExpr(dbid)}, ${ident(cid)}, ${ident(stack)}, ${textExpr(deleted)} FROM ${ident('tb_cook_item')}`
  return query(db, sql).map((row) => ({
    itemDbid: asString(row[0]),
    itemCid: asNumber(row[1]),
    stackCnt: asNumber(row[2]),
    deletedDate: asString(row[3])
  }))
}

function loadSwitches(db: SqlJsDb): SwitchRow[] {
  const cols = pragmaCols(db, 'tb_switch')
  const needed = requireCols(cols, ['CATEGORY', 'BIT_FIELD'])
  if (!needed) return []
  const [category, bitField] = needed
  const sql = `SELECT ${ident(category)}, ${textExpr(bitField)} FROM ${ident('tb_switch')}`
  return query(db, sql).map((row) => ({
    category: asNumber(row[0]),
    bitField: asString(row[1])
  }))
}

function loadKarma(db: SqlJsDb): KarmaRow[] {
  const cols = pragmaCols(db, 'tb_karma')
  const needed = requireCols(cols, ['ITEM_DBID', 'ITEM_CID', 'IS_LOCK', 'EXP', 'ASCEND', 'TRANSCEND', 'DELETED_DATE'])
  if (!needed) return []
  const [dbid, cid, lock, exp, ascend, transcend, deleted] = needed
  const sql = `SELECT ${textExpr(dbid)}, ${ident(cid)}, ${ident(lock)}, ${ident(exp)}, ${ident(ascend)}, ${ident(transcend)}, ${ident(deleted)} FROM ${ident('tb_karma')}`
  return query(db, sql).map((row) => ({
    itemDbid: asString(row[0]),
    itemCid: asNumber(row[1]),
    isLock: asNumber(row[2]),
    exp: asNumber(row[3]),
    ascend: asNumber(row[4]),
    transcend: asNumber(row[5]),
    deletedDate: asNumber(row[6])
  }))
}

function loadTitles(db: SqlJsDb): TitleRow[] {
  const cols = pragmaCols(db, 'tb_title')
  const needed = requireCols(cols, ['CATEGORY', 'BIT_FIELD', 'FAV_BIT_FIELD'])
  if (!needed) return []
  const [category, bitField, fav] = needed
  const sql = `SELECT ${ident(category)}, ${textExpr(bitField)}, ${textExpr(fav)} FROM ${ident('tb_title')}`
  return query(db, sql).map((row) => ({
    category: asNumber(row[0]),
    bitField: asString(row[1]),
    favBitField: asString(row[2])
  }))
}

function loadCostumes(db: SqlJsDb): CostumeRow[] {
  const cols = pragmaCols(db, 'tb_costume')
  const needed = requireCols(cols, ['COSTUME_DBID', 'COSTUME_CID', 'EQUIP_CHARACTER_CID'])
  if (!needed) return []
  const [dbid, cid, equip] = needed
  const sql = `SELECT ${textExpr(dbid)}, ${ident(cid)}, ${ident(equip)} FROM ${ident('tb_costume')}`
  return query(db, sql).map((row) => ({
    costumeDbid: asString(row[0]),
    costumeCid: asNumber(row[1]),
    equipCharacterCid: asNumber(row[2])
  }))
}

function loadVehicles(db: SqlJsDb): VehicleRow[] {
  const cols = pragmaCols(db, 'tb_vehicle')
  const needed = requireCols(cols, ['VEHICLE_DBID', 'VEHICLE_CID'])
  if (!needed) return []
  const [dbid, cid] = needed
  const sql = `SELECT ${textExpr(dbid)}, ${ident(cid)} FROM ${ident('tb_vehicle')}`
  return query(db, sql).map((row) => ({
    vehicleDbid: asString(row[0]),
    vehicleCid: asNumber(row[1])
  }))
}

function loadEquipMounts(db: SqlJsDb): EquipMountRow[] {
  const cols = pragmaCols(db, 'tb_equip_mount')
  const needed = requireCols(cols, ['CHARACTER_CID', 'VEHICLE'])
  if (!needed) return []
  const [cid, vehicle] = needed
  const sql = `SELECT ${ident(cid)}, ${textExpr(vehicle)} FROM ${ident('tb_equip_mount')}`
  return query(db, sql).map((row) => ({
    characterCid: asNumber(row[0]),
    vehicleDbid: asString(row[1])
  }))
}

function loadUser(db: SqlJsDb): { userDbid: string | null; user: UserRow } {
  const empty: UserRow = { regionCid: 0, sectionUid: '0', posX: 0, posY: 0, posZ: 0 }
  const cols = pragmaCols(db, 'tb_user')
  const needed = requireCols(cols, ['REGION_CID', 'SECTION_UID', 'POS_X', 'POS_Y', 'POS_Z'])
  if (!needed) {
    const idCol = cols.get('USER_DBID')
    if (!idCol) return { userDbid: null, user: empty }
    const idRow = query(db, `SELECT ${textExpr(idCol)} FROM ${ident('tb_user')} LIMIT 1`)[0]
    return { userDbid: idRow ? asString(idRow[0]) : null, user: empty }
  }
  const [region, section, x, y, z] = needed
  const userCol = cols.get('USER_DBID')
  const sql = userCol
    ? `SELECT ${textExpr(userCol)}, ${ident(region)}, ${textExpr(section)}, ${ident(x)}, ${ident(y)}, ${ident(z)} FROM ${ident('tb_user')} LIMIT 1`
    : `SELECT '0', ${ident(region)}, ${textExpr(section)}, ${ident(x)}, ${ident(y)}, ${ident(z)} FROM ${ident('tb_user')} LIMIT 1`
  const row = query(db, sql)[0]
  if (!row) return { userDbid: null, user: empty }
  return {
    userDbid: asString(row[0]),
    user: {
      regionCid: asNumber(row[1]),
      sectionUid: asString(row[2]),
      posX: asNumber(row[3]),
      posY: asNumber(row[4]),
      posZ: asNumber(row[5])
    }
  }
}

function firstUserDbid(db: SqlJsDb, table: string): string | null {
  const cols = pragmaCols(db, table)
  const userCol = cols.get('USER_DBID')
  if (!userCol) return null
  const row = query(db, `SELECT ${textExpr(userCol)} FROM ${ident(table)} LIMIT 1`)[0]
  return row ? asString(row[0]) : null
}

export function loadSave(db: SqlJsDb, meta: LoadMeta): DragonSwordState {
  const currencies = loadCurrencies(db)
  const stackables = loadStackables(db)
  const user = loadUser(db)
  const userDbid =
    user.userDbid ??
    currencies.userDbid ??
    stackables.userDbid ??
    firstUserDbid(db, 'tb_character') ??
    firstUserDbid(db, 'tb_cook_item') ??
    firstUserDbid(db, 'tb_switch') ??
    firstUserDbid(db, 'tb_title') ??
    firstUserDbid(db, 'tb_karma') ??
    '0'
  return {
    relativePath: meta.relativePath,
    salt: meta.salt.slice(),
    plaintextBase: meta.plaintextBase,
    userDbid,
    currencies: currencies.rows,
    stackables: stackables.rows,
    characters: loadCharacters(db),
    teams: loadTeams(db),
    equipment: loadEquipment(db),
    cookItems: loadCookItems(db),
    switches: loadSwitches(db),
    titles: loadTitles(db),
    karma: loadKarma(db),
    costumes: loadCostumes(db),
    vehicles: loadVehicles(db),
    equipMounts: loadEquipMounts(db),
    user: user.user
  }
}
