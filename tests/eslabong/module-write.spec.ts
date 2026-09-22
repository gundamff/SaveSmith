import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { computeIntegrity } from '../../src/games/eslabong/integrity'
import { eslabongModule } from '../../src/games/eslabong'
import { compressRscc } from '../../src/games/eslabong/rscc'
import { MAX_EXP, MAX_LEVEL } from '../../src/games/eslabong/model/fields'
import type { FighterRow } from '../../src/games/eslabong/model/types'

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

/** Minimal CampaignSave plaintext with club scalars. */
function buildSyntheticPlain(gold: number, renown = 10, stars = 3, highest = 10): Uint8Array {
  const flags = FORMAT_FLAG_NAMED_SCENE_IDS | FORMAT_FLAG_UIDS | FORMAT_FLAG_HAS_SCRIPT_CLASS
  const head: number[] = []
  writeU32(head, 0)
  writeU32(head, 0)
  writeU32(head, 4)
  writeU32(head, 6)
  writeU32(head, 6)
  writeUnicode(head, 'Resource')
  writeU64(head, 0n)
  writeU32(head, flags)
  writeU64(head, -1n)
  writeUnicode(head, 'CampaignSave')
  for (let i = 0; i < RESERVED_FIELDS; i++) writeU32(head, 0)

  writeU32(head, 4)
  writeUnicode(head, 'player_gold')
  writeUnicode(head, 'renown')
  writeUnicode(head, 'development_stars')
  writeUnicode(head, 'highest_renown_reached')

  writeU32(head, 0)

  writeU32(head, 1)
  writeUnicode(head, 'user://synthetic.res')
  const ofsPos = head.length
  writeU64(head, 0n)

  const resStart = head.length
  const ofsBytes = new Uint8Array(8)
  new DataView(ofsBytes.buffer).setBigUint64(0, BigInt(resStart), true)
  for (let i = 0; i < 8; i++) head[ofsPos + i] = ofsBytes[i]!

  writeUnicode(head, 'Resource')
  writeU32(head, 4)
  writeU32(head, 0)
  writeU32(head, VARIANT_INT)
  writeU32(head, gold >>> 0)
  writeU32(head, 1)
  writeU32(head, VARIANT_INT)
  writeU32(head, renown >>> 0)
  writeU32(head, 2)
  writeU32(head, VARIANT_INT)
  writeU32(head, stars >>> 0)
  writeU32(head, 3)
  writeU32(head, VARIANT_INT)
  writeU32(head, highest >>> 0)

  head.push(0x52, 0x53, 0x52, 0x43)
  return new Uint8Array(head)
}

const enc = (obj: unknown) => new TextEncoder().encode(JSON.stringify(obj))

async function makeSlot(gold: number) {
  const plain = buildSyntheticPlain(gold)
  const resBytes = await compressRscc(plain)
  const jsonPath = 'campaign_save_0.json'
  const resPath = 'campaign_save_0.res'
  const sidecar = {
    team_name: 'TestClub',
    gold,
    season: 1,
    week: 2,
    integrity: '0'.repeat(64),
    campaign_lineage_id: 'keep-me',
    saved_at_text: '2026-09-21 12:00'
  }
  return {
    jsonPath,
    resPath,
    files: [
      { relativePath: jsonPath, bytes: enc(sidecar) },
      { relativePath: resPath, bytes: resBytes }
    ]
  }
}

describe('eslabongModule write path', () => {
  it('parse → change gold → serialize recomputes integrity (64 hex)', async () => {
    const slot = await makeSlot(1000)
    const state = await eslabongModule.parse(slot.files)
    expect(state.writeEnabled).toBe(true)
    expect(state.club.gold).toBe(1000)

    state.club.gold = 2919947
    const out = await eslabongModule.serialize(state)
    expect(out.map((f) => f.relativePath).sort()).toEqual([slot.jsonPath, slot.resPath].sort())

    const jsonOut = out.find((f) => f.relativePath === slot.jsonPath)!
    const resOut = out.find((f) => f.relativePath === slot.resPath)!
    const sidecar = JSON.parse(new TextDecoder().decode(jsonOut.bytes)) as Record<string, unknown>

    expect(sidecar.gold).toBe(2919947)
    expect(sidecar.team_name).toBe('TestClub')
    expect(sidecar.campaign_lineage_id).toBe('keep-me')
    expect(typeof sidecar.integrity).toBe('string')
    expect(sidecar.integrity).toMatch(/^[0-9a-f]{64}$/)
    expect(sidecar.integrity).toBe(
      computeIntegrity({
        sidecar: {
          gold: 2919947,
          team_name: 'TestClub',
          season: 1,
          week: 2
        },
        resBytes: resOut.bytes
      })
    )

    const again = await eslabongModule.parse(out)
    expect(again.club.gold).toBe(2919947)
  })

  it('serialize throws INTEGRITY_UNAVAILABLE when writeEnabled is false', async () => {
    const slot = await makeSlot(50)
    const state = await eslabongModule.parse(slot.files)
    state.writeEnabled = false
    await expect(eslabongModule.serialize(state)).rejects.toMatchObject({
      name: 'ModuleError',
      code: 'INTEGRITY_UNAVAILABLE'
    })
  })

  it('validate rejects non-finite club gold and out-of-range fighter progress', async () => {
    const slot = await makeSlot(10)
    const state = await eslabongModule.parse(slot.files)
    state.club.gold = Number.NaN
    expect(eslabongModule.validate(state).some((i) => i.code === 'INVALID_CLUB')).toBe(true)

    state.club.gold = 10
    const fighter = {
      id: 'f1',
      displayName: 'x',
      level: MAX_LEVEL + 1,
      experience: 0,
      growthStyles: [],
      birth: {},
      growthBase: {},
      career: {},
      personality: {},
      aiProfile: {},
      skills: {},
      injured: false,
      injuryBattlesRemaining: 0,
      injuryDescription: '',
      equippedItemInstanceIds: [],
      _ref: { resourceIndex: 0 }
    } satisfies FighterRow
    state.fighters = [fighter]
    expect(eslabongModule.validate(state).some((i) => i.code === 'INVALID_FIGHTER')).toBe(true)

    fighter.level = 1
    fighter.experience = MAX_EXP + 1
    expect(eslabongModule.validate(state).some((i) => i.code === 'INVALID_FIGHTER')).toBe(true)

    fighter.experience = 0
    fighter.birth = { birth_max_hp: 99999 }
    expect(eslabongModule.validate(state).some((i) => i.code === 'INVALID_FIGHTER')).toBe(true)

    fighter.birth = {}
    state.items = [
      {
        instanceId: 'i1',
        definitionId: 'REL_R_001',
        quality: '',
        exceptionalRoll: false,
        equippedFighterId: '',
        equippedSlot: -1,
        inventorySlot: -1,
        rolledModifiers: { hp_flat: 999 },
        stats: [{ statId: 'hp_flat', amount: 999, ratio: 0 }],
        _ref: { resourceIndex: 0 }
      }
    ]
    expect(eslabongModule.validate(state).some((i) => i.code === 'INVALID_ITEM')).toBe(true)
  })

  it('actions max-progress and clear-injuries mutate fighters', async () => {
    const slot = await makeSlot(10)
    const state = await eslabongModule.parse(slot.files)
    state.fighters = [
      {
        id: 'f1',
        displayName: 'Hurt',
        level: 3,
        experience: 10,
        growthStyles: [],
        birth: {},
        growthBase: {},
        career: {},
        personality: {},
        aiProfile: {},
        skills: {},
        injured: true,
        injuryBattlesRemaining: 2,
        injuryDescription: 'sprain',
        equippedItemInstanceIds: [],
        _ref: { resourceIndex: 0 }
      }
    ]

    const specs = eslabongModule.actions(state)
    expect(specs.map((a) => a.id).sort()).toEqual(['clear-injuries', 'max-progress'])

    eslabongModule.applyAction(state, 'max-progress')
    expect(state.fighters[0]!.level).toBe(MAX_LEVEL)
    expect(state.fighters[0]!.experience).toBe(MAX_EXP)

    eslabongModule.applyAction(state, 'clear-injuries')
    expect(state.fighters[0]!.injured).toBe(false)
    expect(state.fighters[0]!.injuryBattlesRemaining).toBe(0)
    expect(state.fighters[0]!.injuryDescription).toBe('')

    expect(() => eslabongModule.applyAction(state, 'nope')).toThrow(ModuleError)
  })
})

const realRes = process.env.ESLABONG_RES
const realJson = process.env.ESLABONG_JSON
describe.skipIf(!realRes || !realJson || !existsSync(realRes!) || !existsSync(realJson!))(
  'eslabongModule write path (real save)',
  () => {
    it('parse → bump gold → serialize integrity matches computeIntegrity', async () => {
      const resPath = realRes!.replace(/\\/g, '/').split('/').pop()!
      const jsonPath = realJson!.replace(/\\/g, '/').split('/').pop()!
      const state = await eslabongModule.parse([
        { relativePath: jsonPath, bytes: new Uint8Array(readFileSync(realJson!)) },
        { relativePath: resPath, bytes: new Uint8Array(readFileSync(realRes!)) }
      ])
      const nextGold = state.club.gold + 1
      state.club.gold = nextGold
      const out = await eslabongModule.serialize(state)
      const jsonOut = out.find((f) => f.relativePath === jsonPath)!
      const resOut = out.find((f) => f.relativePath === resPath)!
      const sidecar = JSON.parse(new TextDecoder().decode(jsonOut.bytes)) as Record<string, unknown>
      expect(sidecar.gold).toBe(nextGold)
      expect(sidecar.integrity).toBe(
        computeIntegrity({
          sidecar: sidecar as { gold: number; team_name: string; season: number; week: number },
          resBytes: resOut.bytes
        })
      )
    })
  }
)
