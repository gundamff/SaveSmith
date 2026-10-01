import { encodeInt } from '../../src/games/dead-cells/model/hxbit'

/**
 * Synthetic S_User-shaped HXS fixture mirroring the real Dead Cells User
 * schema subset: resources, itemMeta.itemProgress[], userStats (+bossRushData),
 * skins. Program-generated so no real player save is committed.
 */

const parts: Uint8Array[] = []

function push(...bs: (Uint8Array | number[])[]): void {
  for (const b of bs) parts.push(b instanceof Uint8Array ? b : new Uint8Array(b))
}
function u8(v: number): number[] {
  return [v]
}
function str(s: string): Uint8Array {
  const body = new TextEncoder().encode(s)
  return new Uint8Array([body.length + 1, ...body])
}
function varint(v: number): Uint8Array {
  return encodeInt(v)
}

const KINDS = [
  'PInt', 'PFloat', 'PBool', 'PString', 'PBytes', 'PSerializable', 'PEnum',
  'PMap', 'PArray', 'PObj', 'PAlias', 'PVector', 'PNull', 'PUnknown',
  'PDynamic', 'PInt64', 'PFlags', 'PCustom', 'PSerInterface', 'POldStruct',
  'PAliasCDB', 'PNoSave', 'PStruct'
]
function kind(name: string): number {
  return KINDS.indexOf(name) + 1
}
function tSimple(name: string): number[] {
  return u8(kind(name))
}
function tNamed(name: string, cls: string): Uint8Array {
  return new Uint8Array([kind(name), ...str(cls)])
}
function tArray(inner: number[]): number[] {
  return [kind('PArray'), ...inner]
}
function tObj(fields: { name: string; type: number[] }[]): number[] {
  const out: number[] = [kind('PObj'), ...varint(fields.length + 1)]
  for (const f of fields) {
    // bits = name(1) + type(2) + 1 = 4
    out.push(...varint(4), ...str(f.name), u8(0), ...f.type)
  }
  return out
}

function concat(): Uint8Array {
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

export interface FixtureOptions {
  deathMoney?: number
  deathCells?: number
  items?: { itemId: string; investedCells: number; isNew: boolean; unlocked: boolean }[]
  heroSkin?: string
  heroHeadSkin?: string
  bossRush?: { field: string; idx: number; unlock: boolean }[]
  metaItems?: string[]
  permanentItems?: string[]
}

export function buildUserChunk(opts: FixtureOptions = {}): Uint8Array {
  const {
    deathMoney = 100,
    deathCells = 5,
    items = [
      { itemId: 'sword', investedCells: 3, isNew: true, unlocked: false },
      { itemId: 'bow', investedCells: 0, isNew: false, unlocked: true }
    ],
    heroSkin = 'default',
    heroHeadSkin = 'head0',
    bossRush = [
      { field: 'unlockedGameMode', idx: 0, unlock: true },
      { field: 'unlockedGameMode', idx: 1, unlock: false }
    ],
    metaItems = [],
    permanentItems = []
  } = opts

  parts.length = 0
  push(str('HXS'), u8(1))
  // class table: User(0,1), ItemMetaManager(0,2), ItemProgress(0,3), UserStats(0,4), BossRushData(0,5)
  const classes: [string, number][] = [
    ['User', 1],
    ['tool.ItemMetaManager', 2],
    ['tool.ItemProgress', 3],
    ['UserStats', 4],
    ['tool.bossRush.BossRushData', 5]
  ]
  for (const [name, clid] of classes) {
    push(str(name), u8(clid >> 8), u8(clid & 0xff), u8(0), u8(0), u8(0), u8(0))
  }
  push(u8(0))

  const schemaBodies: Uint8Array[] = []
  const s = (...xs: (Uint8Array | number[])[]): void => {
    for (const x of xs) schemaBodies.push(x instanceof Uint8Array ? x : new Uint8Array(x))
  }

  // User schema: deathMoney, deathCells, heroSkin, heroHeadSkin,
  //   consecutiveCompletedRuns, itemMeta, userStats, metaItems
  s(varint(1), varint(1), varint(9))
  for (const n of [
    'deathMoney', 'deathCells', 'heroSkin', 'heroHeadSkin',
    'consecutiveCompletedRuns', 'itemMeta', 'userStats', 'metaItems'
  ]) s(str(n))
  const userTypes: number[][] = [
    tSimple('PInt'),
    tSimple('PInt'),
    tSimple('PString'),
    tSimple('PString'),
    tSimple('PInt'),
    tNamed('PSerializable', 'tool.ItemMetaManager'),
    tNamed('PSerializable', 'UserStats'),
    tArray(tSimple('PString'))
  ]
  s(varint(userTypes.length + 1))
  for (const t of userTypes) s(t)

  // ItemMetaManager: itemProgress (array of ItemProgress), permanentItems (strings)
  s(varint(2), varint(2), varint(3))
  s(str('itemProgress'))
  s(str('permanentItems'))
  s(varint(3))
  s(tArray(tNamed('PSerializable', 'tool.ItemProgress')))
  s(tArray(tSimple('PString')))

  // ItemProgress: itemId, investedCells, isNew, unlocked
  s(varint(3), varint(3), varint(5))
  for (const n of ['itemId', 'investedCells', 'isNew', 'unlocked']) s(str(n))
  const itemTypes = [tSimple('PString'), tSimple('PInt'), tSimple('PBool'), tSimple('PBool')]
  s(varint(itemTypes.length + 1))
  for (const t of itemTypes) s(t)

  // UserStats: runs, goldEarned, bossRushData
  s(varint(4), varint(4), varint(4))
  for (const n of ['runs', 'goldEarned', 'bossRushData']) s(str(n))
  const statTypes = [tSimple('PInt'), tSimple('PInt'), tNamed('PSerializable', 'tool.bossRush.BossRushData')]
  s(varint(statTypes.length + 1))
  for (const t of statTypes) s(t)

  // BossRushData: unlockedGameMode (array of PObj{idx:Int,unlock:Bool})
  s(varint(5), varint(5), varint(2))
  s(str('unlockedGameMode'))
  s(varint(2))
  s(
    tArray(
      tObj([
        { name: 'idx', type: tSimple('PInt') },
        { name: 'unlock', type: tSimple('PBool') }
      ])
    )
  )

  let schemaLen = 0
  for (const x of schemaBodies) schemaLen += x.length
  push(varint(schemaLen))
  push(...schemaBodies)

  // ---- object data ----
  let nextUid = 1
  const userUid = nextUid++
  push(varint(userUid))
  push(varint(deathMoney))
  push(varint(deathCells))
  push(str(heroSkin))
  push(str(heroHeadSkin))
  push(varint(0)) // consecutiveCompletedRuns

  // itemMeta ref + body (itemProgress[], permanentItems[])
  const metaUid = nextUid++
  push(varint(metaUid))
  push(varint(items.length + 1))
  for (const it of items) {
    const uid = nextUid++
    push(varint(uid))
    push(str(it.itemId))
    push(varint(it.investedCells))
    push(u8(it.isNew ? 1 : 0))
    push(u8(it.unlocked ? 1 : 0))
  }
  push(varint(permanentItems.length + 1))
  for (const p of permanentItems) push(str(p))

  // userStats ref + body (runs, goldEarned, bossRushData)
  const statsUid = nextUid++
  push(varint(statsUid))
  push(varint(4)) // runs
  push(varint(250)) // goldEarned

  const bossUid = nextUid++
  push(varint(bossUid))
  push(varint(bossRush.length + 1))
  for (const b of bossRush) {
    // PObj value: varint(bits+1) then field values; no nullable fields -> bits=0
    push(varint(1), varint(b.idx))
    push(u8(b.unlock ? 1 : 0))
  }

  // metaItems[] (last User field)
  push(varint(metaItems.length + 1))
  for (const m of metaItems) push(str(m))

  return concat()
}
