import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decompressRscc } from '../../src/games/eslabong/rscc'
import {
  getPath,
  parseResourceBinary,
  serializeResourceBinary,
  setPath,
  type ResValue
} from '../../src/games/eslabong/resource/binary'

/** Godot binary resource format flags (4.x). */
const FORMAT_FLAG_NAMED_SCENE_IDS = 1
const FORMAT_FLAG_UIDS = 2
const FORMAT_FLAG_HAS_SCRIPT_CLASS = 8
const RESERVED_FIELDS = 11
const VARIANT_INT = 3

function writeU32(buf: number[], v: number) {
  buf.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff)
}

function writeU64(buf: number[], v: bigint) {
  const lo = Number(v & 0xffffffffn)
  const hi = Number((v >> 32n) & 0xffffffffn)
  writeU32(buf, lo)
  writeU32(buf, hi >>> 0)
}

function writeUnicode(buf: number[], s: string) {
  const utf8 = Array.from(new TextEncoder().encode(s))
  writeU32(buf, utf8.length + 1)
  buf.push(...utf8, 0)
}

/** Minimal CampaignSave-like plaintext (no leading RSRC magic). */
function buildSyntheticPlain(gold: number, renown: number): Uint8Array {
  const flags = FORMAT_FLAG_NAMED_SCENE_IDS | FORMAT_FLAG_UIDS | FORMAT_FLAG_HAS_SCRIPT_CLASS
  const head: number[] = []
  writeU32(head, 0) // big_endian
  writeU32(head, 0) // use_real64 (unused; real size from flags)
  writeU32(head, 4)
  writeU32(head, 6)
  writeU32(head, 6)
  writeUnicode(head, 'Resource')
  writeU64(head, 0n) // importmd_ofs
  writeU32(head, flags)
  writeU64(head, -1n) // uid
  writeUnicode(head, 'CampaignSave')
  for (let i = 0; i < RESERVED_FIELDS; i++) writeU32(head, 0)

  writeU32(head, 2) // string table
  writeUnicode(head, 'player_gold')
  writeUnicode(head, 'renown')

  writeU32(head, 0) // ext resources

  writeU32(head, 1) // int resources
  writeUnicode(head, 'user://synthetic.res')
  const ofsPos = head.length
  writeU64(head, 0n) // placeholder offset

  const resStart = head.length
  // patch offset
  const ofsBytes = new Uint8Array(8)
  new DataView(ofsBytes.buffer).setBigUint64(0, BigInt(resStart), true)
  for (let i = 0; i < 8; i++) head[ofsPos + i] = ofsBytes[i]!

  writeUnicode(head, 'Resource')
  writeU32(head, 2) // property count
  writeU32(head, 0) // name idx player_gold
  writeU32(head, VARIANT_INT)
  writeU32(head, gold >>> 0)
  writeU32(head, 1) // name idx renown
  writeU32(head, VARIANT_INT)
  writeU32(head, renown >>> 0)

  head.push(0x52, 0x53, 0x52, 0x43) // RSRC footer
  return new Uint8Array(head)
}

describe('eslabong resource binary (synthetic)', () => {
  it('parses root scalars from synthetic CampaignSave', () => {
    const plain = buildSyntheticPlain(2919170, 100)
    const doc = parseResourceBinary(plain)
    expect(doc.root.player_gold).toBe(2919170)
    expect(doc.root.renown).toBe(100)
    expect(getPath(doc, 'player_gold')).toBe(2919170)
  })

  it('round-trips parse→serialize without edits (byte-identical)', () => {
    const plain = buildSyntheticPlain(42, 7)
    const doc = parseResourceBinary(plain)
    const out = serializeResourceBinary(doc)
    expect(Buffer.from(out).equals(Buffer.from(plain))).toBe(true)
  })

  it('setPath player_gold then parse yields new value', () => {
    const plain = buildSyntheticPlain(100, 5)
    const doc = parseResourceBinary(plain)
    setPath(doc, 'player_gold', 2919947)
    expect(getPath(doc, 'player_gold')).toBe(2919947)
    const again = parseResourceBinary(serializeResourceBinary(doc))
    expect(again.root.player_gold).toBe(2919947)
    expect(again.root.renown).toBe(5)
  })

  it('setPath supports nested dict paths a.b.c', () => {
    // Build via mutate: start synthetic, inject nested dict into root via setPath after extending?
    // Minimal: parse synthetic, manually put nested object, serialize path API.
    const plain = buildSyntheticPlain(1, 2)
    const doc = parseResourceBinary(plain)
    const nested: ResValue = { b: { c: 99 } }
    setPath(doc, 'a', nested)
    expect(getPath(doc, 'a.b.c')).toBe(99)
    setPath(doc, 'a.b.c', 123)
    expect(getPath(doc, 'a.b.c')).toBe(123)
  })
})

const plainEnv = process.env.ESLABONG_PLAIN
const resEnv = process.env.ESLABONG_RES
const describeReal =
  (plainEnv && existsSync(plainEnv)) || (resEnv && existsSync(resEnv)) ? describe : describe.skip

describeReal('eslabong resource binary (real save)', () => {
  async function loadPlain(): Promise<Uint8Array> {
    if (plainEnv && existsSync(plainEnv)) return new Uint8Array(readFileSync(plainEnv))
    const packed = new Uint8Array(readFileSync(resEnv!))
    return decompressRscc(packed)
  }

  it('reads player_gold and round-trips without edits preserving root scalars', async () => {
    const plain = await loadPlain()
    const doc = parseResourceBinary(plain)
    expect(typeof doc.root.player_gold).toBe('number')
    expect(doc.root.player_gold as number).toBeGreaterThan(0)
    const gold = doc.root.player_gold as number
    const renown = doc.root.renown as number
    const stars = doc.root.development_stars as number
    const out = serializeResourceBinary(doc)
    const again = parseResourceBinary(out)
    expect(again.root.player_gold).toBe(gold)
    expect(again.root.renown).toBe(renown)
    expect(again.root.development_stars).toBe(stars)
  }, 60_000)

  it('setPath player_gold survives serialize→parse', async () => {
    const plain = await loadPlain()
    const doc = parseResourceBinary(plain)
    const next = ((doc.root.player_gold as number) || 0) + 77
    setPath(doc, 'player_gold', next)
    const again = parseResourceBinary(serializeResourceBinary(doc))
    expect(again.root.player_gold).toBe(next)
  }, 60_000)
})
