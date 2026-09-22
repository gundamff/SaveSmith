import {
  FORMAT_FLAG_HAS_SCRIPT_CLASS,
  FORMAT_FLAG_REAL_T_IS_DOUBLE,
  FORMAT_FLAG_UIDS,
  RESERVED_FIELDS,
  type BinReader,
  type BinWriter,
  type ResValue,
  type VariantNode,
  isRawValue,
  parseVariant,
  readName,
  readU32,
  readU64,
  readUnicode,
  resValueToVariant,
  variantToResValue,
  writeName,
  writeU32,
  writeU64,
  writeUnicode,
  writeVariant
} from './variant'

export type { ResValue } from './variant'
export { isRawValue } from './variant'

export type PropWire = {
  name: string
  nameIndex: number | null
  inline: boolean
  value: VariantNode
}

export type IntResourceWire = {
  path: string
  type: string
  properties: PropWire[]
}

export type ExtResourceWire = {
  type: string
  path: string
  uid: bigint
}

export type ResourceWire = {
  bigEndian: number
  useReal64: number
  verMajor: number
  verMinor: number
  verFormat: number
  type: string
  importmdOfs: bigint
  flags: number
  uid: bigint
  scriptClass: string | null
  reserved: number[]
  stringTable: string[]
  externals: ExtResourceWire[]
  resources: IntResourceWire[]
  usingUids: boolean
}

export interface ResourceDoc {
  /** Opaque header / string table / unread blobs preserved for rewrite */
  wire: ResourceWire
  /** Convenient property bag for CampaignSave root (best-effort) */
  root: Record<string, ResValue>
}

function makeReader(plain: Uint8Array, realIsDouble: boolean, stringTable: string[]): BinReader {
  return {
    view: new DataView(plain.buffer, plain.byteOffset, plain.byteLength),
    bytes: plain,
    pos: 0,
    realIsDouble,
    stringTable
  }
}

export function parseResourceBinary(plain: Uint8Array): ResourceDoc {
  if (plain.length < 20) throw new Error('resource: truncated')
  const r = makeReader(plain, false, [])

  const bigEndian = readU32(r)
  const useReal64 = readU32(r)
  const verMajor = readU32(r)
  const verMinor = readU32(r)
  const verFormat = readU32(r)
  if (bigEndian !== 0) throw new Error('resource: big-endian not supported')

  const type = readUnicode(r)
  const importmdOfs = readU64(r)
  const flags = readU32(r)
  const uid = r.view.getBigInt64(r.pos, true)
  r.pos += 8

  const realIsDouble = (flags & FORMAT_FLAG_REAL_T_IS_DOUBLE) !== 0
  r.realIsDouble = realIsDouble
  const usingUids = (flags & FORMAT_FLAG_UIDS) !== 0

  let scriptClass: string | null = null
  if (flags & FORMAT_FLAG_HAS_SCRIPT_CLASS) {
    scriptClass = readUnicode(r)
  }

  const reserved: number[] = []
  for (let i = 0; i < RESERVED_FIELDS; i++) reserved.push(readU32(r))

  const stringCount = readU32(r)
  const stringTable: string[] = []
  for (let i = 0; i < stringCount; i++) stringTable.push(readUnicode(r))
  r.stringTable = stringTable

  const extCount = readU32(r)
  const externals: ExtResourceWire[] = []
  for (let i = 0; i < extCount; i++) {
    const et = readUnicode(r)
    const path = readUnicode(r)
    let euid = -1n
    if (usingUids) {
      euid = r.view.getBigInt64(r.pos, true)
      r.pos += 8
    }
    externals.push({ type: et, path, uid: euid })
  }

  const intCount = readU32(r)
  const intMeta: Array<{ path: string; offset: number }> = []
  for (let i = 0; i < intCount; i++) {
    const path = readUnicode(r)
    const offset = Number(readU64(r))
    intMeta.push({ path, offset })
  }

  const resources: IntResourceWire[] = []
  for (let i = 0; i < intMeta.length; i++) {
    const meta = intMeta[i]!
    r.pos = meta.offset
    const rtype = readUnicode(r)
    const pc = readU32(r)
    const properties: PropWire[] = []
    for (let j = 0; j < pc; j++) {
      const nm = readName(r)
      const value = parseVariant(r)
      properties.push({
        name: nm.name,
        nameIndex: nm.nameIndex,
        inline: nm.inline,
        value
      })
    }
    resources.push({ path: meta.path, type: rtype, properties })
  }

  const wire: ResourceWire = {
    bigEndian,
    useReal64,
    verMajor,
    verMinor,
    verFormat,
    type,
    importmdOfs,
    flags,
    uid,
    scriptClass,
    reserved,
    stringTable,
    externals,
    resources,
    usingUids
  }

  const root: Record<string, ResValue> = {}
  const main = resources[resources.length - 1]
  if (main) {
    for (const p of main.properties) {
      root[p.name] = variantToResValue(p.value)
    }
  }

  return { wire, root }
}

export function serializeResourceBinary(doc: ResourceDoc): Uint8Array {
  syncRootToMain(doc)

  const wire = doc.wire
  const w: BinWriter = {
    chunks: [],
    realIsDouble: (wire.flags & FORMAT_FLAG_REAL_T_IS_DOUBLE) !== 0,
    stringTable: wire.stringTable
  }

  writeU32(w, wire.bigEndian)
  writeU32(w, wire.useReal64)
  writeU32(w, wire.verMajor)
  writeU32(w, wire.verMinor)
  writeU32(w, wire.verFormat)
  writeUnicode(w, wire.type)
  writeU64(w, wire.importmdOfs)
  writeU32(w, wire.flags)
  writeU64(w, BigInt.asUintN(64, wire.uid))
  if (wire.flags & FORMAT_FLAG_HAS_SCRIPT_CLASS) {
    writeUnicode(w, wire.scriptClass ?? '')
  }
  for (let i = 0; i < RESERVED_FIELDS; i++) writeU32(w, wire.reserved[i] ?? 0)

  writeU32(w, wire.stringTable.length)
  for (const s of wire.stringTable) writeUnicode(w, s)

  writeU32(w, wire.externals.length)
  for (const er of wire.externals) {
    writeUnicode(w, er.type)
    writeUnicode(w, er.path)
    if (wire.usingUids) writeU64(w, BigInt.asUintN(64, er.uid))
  }

  writeU32(w, wire.resources.length)
  const ofsPlaceholders: number[] = []
  for (const res of wire.resources) {
    writeUnicode(w, res.path)
    ofsPlaceholders.push(w.chunks.length)
    writeU64(w, 0n)
  }

  const offsets: number[] = []
  for (const res of wire.resources) {
    offsets.push(w.chunks.length)
    writeUnicode(w, res.type)
    writeU32(w, res.properties.length)
    for (const p of res.properties) {
      writeName(w, p.inline ? null : p.nameIndex, p.name)
      writeVariant(w, p.value)
    }
  }

  for (let i = 0; i < ofsPlaceholders.length; i++) {
    const at = ofsPlaceholders[i]!
    const off = BigInt(offsets[i]!)
    const lo = Number(off & 0xffffffffn)
    const hi = Number((off >> 32n) & 0xffffffffn)
    w.chunks[at] = lo & 0xff
    w.chunks[at + 1] = (lo >>> 8) & 0xff
    w.chunks[at + 2] = (lo >>> 16) & 0xff
    w.chunks[at + 3] = (lo >>> 24) & 0xff
    w.chunks[at + 4] = hi & 0xff
    w.chunks[at + 5] = (hi >>> 8) & 0xff
    w.chunks[at + 6] = (hi >>> 16) & 0xff
    w.chunks[at + 7] = (hi >>> 24) & 0xff
  }

  w.chunks.push(0x52, 0x53, 0x52, 0x43)
  return new Uint8Array(w.chunks)
}

/** Push `root` edits back onto the main internal resource property list. */
function syncRootToMain(doc: ResourceDoc): void {
  const main = doc.wire.resources[doc.wire.resources.length - 1]
  if (!main) return

  const byName = new Map(main.properties.map((p) => [p.name, p]))
  for (const [name, value] of Object.entries(doc.root)) {
    const existing = byName.get(name)
    if (existing) {
      existing.value = resValueToVariant(value, existing.value)
    } else {
      let nameIndex = doc.wire.stringTable.indexOf(name)
      if (nameIndex < 0) {
        nameIndex = doc.wire.stringTable.length
        doc.wire.stringTable.push(name)
      }
      const prop: PropWire = {
        name,
        nameIndex,
        inline: false,
        value: resValueToVariant(value)
      }
      main.properties.push(prop)
      byName.set(name, prop)
    }
  }
}

export function getPath(doc: ResourceDoc, path: string): ResValue | undefined {
  const parts = path.split('.').filter(Boolean)
  let cur: ResValue | undefined = doc.root
  for (const p of parts) {
    if (cur === undefined || cur === null || typeof cur !== 'object' || Array.isArray(cur) || isRawValue(cur)) {
      return undefined
    }
    cur = (cur as Record<string, ResValue>)[p]
  }
  return cur
}

export function setPath(doc: ResourceDoc, path: string, value: ResValue): void {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) throw new Error('resource: empty path')

  let cur: Record<string, ResValue> = doc.root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    const next = cur[key]
    if (next === null || next === undefined || typeof next !== 'object' || Array.isArray(next) || isRawValue(next)) {
      cur[key] = {}
    }
    cur = cur[key] as Record<string, ResValue>
  }
  cur[parts[parts.length - 1]!] = value
}
