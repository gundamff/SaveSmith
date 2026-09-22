import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { modules } from '@host/registry'
import { eslabongModule } from '../../src/games/eslabong'
import { compressRscc } from '../../src/games/eslabong/rscc'

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

function buildSyntheticPlain(gold: number, renown: number): Uint8Array {
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

  writeU32(head, 2)
  writeUnicode(head, 'player_gold')
  writeUnicode(head, 'renown')

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
  writeU32(head, 2)
  writeU32(head, 0)
  writeU32(head, VARIANT_INT)
  writeU32(head, gold >>> 0)
  writeU32(head, 1)
  writeU32(head, VARIANT_INT)
  writeU32(head, renown >>> 0)

  head.push(0x52, 0x53, 0x52, 0x43)
  return new Uint8Array(head)
}

const enc = (obj: unknown) => new TextEncoder().encode(JSON.stringify(obj))

describe('eslabongModule catalog / locate / registry', () => {
  it('registers as eslabong with overview view', () => {
    expect(eslabongModule.id).toBe('eslabong')
    expect(eslabongModule.views.map((v) => v.id)).toEqual(['overview', 'fighters', 'items'])
    expect(eslabongModule.views.map((v) => v.labelKey)).toEqual([
      'es.tabs.overview',
      'es.tabs.fighters',
      'es.tabs.items'
    ])
    expect(eslabongModule.views.every((v) => v.component != null)).toBe(true)
    expect(eslabongModule.catalog).toMatchObject({
      name: { zh: 'Eslabong', en: 'Eslabong' },
      rightsHolder: 'shirowita',
      developer: 'shirowita',
      publisher: 'shirowita',
      steamAppId: 4560660
    })
    expect(eslabongModule.catalog.cover.length).toBeGreaterThan(0)
    expect(eslabongModule.locate).toEqual({
      windowsPathTemplates: ['%USERPROFILE%\\AppData\\Roaming\\Godot\\app_userdata\\Eslabong'],
      identifyAnyOf: ['campaign_autosave.json'],
      identifyNameRegex: '^campaign_(save_\\d+|autosave(_\\d+)?)\\.json$',
      slotFilePatterns: ['campaign_save_*.json', 'campaign_autosave.json']
    })
    expect(modules.map((m) => m.id)).toContain('eslabong')
  })
})

describe('eslabongModule parse / serialize', () => {
  const jsonPath = 'campaign_save_0.json'
  const resPath = 'campaign_save_0.res'
  const sidecar = {
    team_name: '爸爸很坏',
    gold: 217,
    season: 1,
    week: 8,
    saved_at_text: '2026-08-29 22:14',
    logo_path: 'res://x.png',
    challenge_tower_team_submitted: false
  }

  async function fixture() {
    const resBytes = await compressRscc(buildSyntheticPlain(217, 100))
    const jsonBytes = enc(sidecar)
    return {
      jsonBytes,
      resBytes,
      files: [
        { relativePath: jsonPath, bytes: jsonBytes },
        { relativePath: resPath, bytes: resBytes }
      ]
    }
  }

  it('parse reads sidecar + resource projections', async () => {
    const { files, jsonBytes, resBytes } = await fixture()
    const state = await eslabongModule.parse(files)
    expect(state.sidecar.team_name).toBe('爸爸很坏')
    expect(state.sidecar.saved_at_text).toBe('2026-08-29 22:14')
    expect(state.sidecar.logo_path).toBe('res://x.png')
    expect(state.sidecar.challenge_tower_team_submitted).toBe(false)
    expect(state.club.gold).toBe(217)
    expect(state.club.renown).toBe(100)
    expect(state.writeEnabled).toBe(true)
    expect(state.sidecarPath).toBe(jsonPath)
    expect(state.resPath).toBe(resPath)
    expect(state.originalSidecarBytes).toBe(jsonBytes)
    expect(state.originalResBytes).toBe(resBytes)
    expect(state.fighters).toEqual([])
    expect(state.items).toEqual([])
  })

  it('parse throws MISSING_FIELD without campaign json', async () => {
    const { resBytes } = await fixture()
    await expect(
      eslabongModule.parse([{ relativePath: resPath, bytes: resBytes }])
    ).rejects.toThrow(ModuleError)
  })

  it('parse throws MISSING_FIELD without .res', async () => {
    await expect(
      eslabongModule.parse([{ relativePath: jsonPath, bytes: enc(sidecar) }])
    ).rejects.toThrow(ModuleError)
  })

  it('serialize emits json+res with synced gold', async () => {
    const { files } = await fixture()
    const state = await eslabongModule.parse(files)
    state.club.gold = 999
    const out = await eslabongModule.serialize(state)
    expect(out).toHaveLength(2)
    const jsonOut = out.find((f) => f.relativePath === jsonPath)!
    const doc = JSON.parse(new TextDecoder().decode(jsonOut.bytes)) as { gold: number; integrity: string }
    expect(doc.gold).toBe(999)
    expect(doc.integrity).toMatch(/^[0-9a-f]{64}$/)
  })

  it('actions list max-progress / clear-injuries; validate empty for clean state', async () => {
    const { files } = await fixture()
    const state = await eslabongModule.parse(files)
    expect(eslabongModule.actions(state).map((a) => a.id).sort()).toEqual([
      'clear-injuries',
      'max-progress'
    ])
    expect(eslabongModule.validate(state)).toEqual([])
    expect(() => eslabongModule.applyAction(state, 'x')).toThrow(ModuleError)
  })
})
