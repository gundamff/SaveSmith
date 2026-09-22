import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FIGHTER_BIRTH_KEYS,
  FIGHTER_CAREER_KEYS,
  FIGHTER_GROWTH_BASE_KEYS,
  FIGHTER_PERSONALITY_KEYS,
  FIGHTER_EQUIPPED_ITEM_IDS_KEY,
  FIGHTER_ROSTER_PATH,
  MAX_EXP,
  MAX_LEVEL
} from '../../src/games/eslabong/model/fields'
import {
  applyFighter,
  clearInjury,
  listFighters,
  maxProgress
} from '../../src/games/eslabong/model/fighters'
import { decompressRscc } from '../../src/games/eslabong/rscc'
import {
  parseResourceBinary,
  type PropWire,
  type ResourceDoc,
  type ResourceWire
} from '../../src/games/eslabong/resource/binary'
import {
  OBJECT_INTERNAL_RESOURCE,
  VARIANT_OBJECT,
  type VariantNode
} from '../../src/games/eslabong/resource/variant'

function encodeInternalRef(index: number): { __raw: Uint8Array; __hint: string } {
  const buf = new Uint8Array(12)
  const view = new DataView(buf.buffer)
  view.setUint32(0, VARIANT_OBJECT, true)
  view.setUint32(4, OBJECT_INTERNAL_RESOURCE, true)
  view.setUint32(8, index, true)
  return { __raw: buf, __hint: `object_${OBJECT_INTERNAL_RESOURCE}` }
}

function prop(name: string, value: VariantNode): PropWire {
  return { name, nameIndex: null, inline: true, value }
}

function makeFighterDoc(): ResourceDoc {
  const aiProps: PropWire[] = [
    prop('adaptability', { kind: 'double', value: 0.4 }),
    prop('teamwork_affinity', { kind: 'double', value: 0.3 }),
    prop('revenge_factor', { kind: 'double', value: 0.8 }),
    prop('showmanship', { kind: 'double', value: 0.2 }),
    prop('situational_awareness', { kind: 'double', value: 0.6 }),
    prop('overconfidence', { kind: 'double', value: 0.5 }),
    prop('aggression', { kind: 'double', value: 0.7 }),
    prop('mistake_chance', { kind: 'double', value: 0.1 }),
    prop('opaque_ai_flag', { kind: 'bool', value: true })
  ]

  const fighterProps: PropWire[] = [
    prop('instance_id', { kind: 'string', value: 'merc_001' }),
    prop('display_name', { kind: 'string', value: 'Test Monk' }),
    prop('config_id', {
      kind: 'string',
      value: 'res://Data/Mercenaries/Merc_Monk.tres'
    }),
    prop('level', { kind: 'int', value: 10 }),
    prop('experience', { kind: 'int', value: 100 }),
    prop('growth_styles', {
      kind: 'array',
      items: [{ kind: 'string', value: 'balanced' }]
    }),
    prop('birth_max_hp', { kind: 'int', value: 500 }),
    prop('birth_defense', { kind: 'double', value: 0.1 }),
    prop('growth_base_damage', { kind: 'int', value: 11 }),
    prop('growth_base_max_hp', { kind: 'int', value: 391 }),
    prop('career_max_hp', { kind: 'int', value: 1125 }),
    prop('career_damage', { kind: 'int', value: 28 }),
    prop('active_abilities', {
      kind: 'array',
      items: [
        { kind: 'string', value: 'res://Data/Abilities/a.tres' },
        { kind: 'string', value: 'res://Data/Abilities/b.tres' },
        { kind: 'string', value: 'res://Data/Abilities/c.tres' }
      ]
    }),
    prop('ability_hotkey_slots', {
      kind: 'array',
      items: [
        { kind: 'string', value: 'res://Data/Abilities/a.tres' },
        { kind: 'string', value: 'res://Data/Abilities/b.tres' },
        { kind: 'string', value: 'res://Data/Abilities/c.tres' }
      ]
    }),
    prop('is_injured', { kind: 'bool', value: true }),
    prop('injury_battles_remaining', { kind: 'int', value: 3 }),
    prop('injury_description', { kind: 'string', value: 'bruised ribs' }),
    prop(FIGHTER_EQUIPPED_ITEM_IDS_KEY, {
      kind: 'array',
      items: [
        { kind: 'string', value: 'item-a' },
        { kind: 'string', value: 'item-b' }
      ]
    }),
    prop('ai_profile_override', {
      kind: 'object',
      objType: OBJECT_INTERNAL_RESOURCE,
      index: 0
    }),
    prop('opaque_extra', { kind: 'string', value: 'keep-me' }),
    prop('battles_played', { kind: 'int', value: 29 })
  ]

  const resources = [
    {
      path: 'local://ai_0',
      type: 'Resource',
      properties: aiProps
    },
    {
      path: 'local://fighter_0',
      type: 'Resource',
      properties: fighterProps
    },
    {
      path: 'user://campaign.res',
      type: 'Resource',
      properties: [
        prop('player_gold', { kind: 'int', value: 1000 }),
        prop(FIGHTER_ROSTER_PATH, {
          kind: 'array',
          items: [
            {
              kind: 'object',
              objType: OBJECT_INTERNAL_RESOURCE,
              index: 1
            }
          ]
        })
      ]
    }
  ]

  const wire = {
    bigEndian: 0,
    useReal64: 0,
    verMajor: 4,
    verMinor: 6,
    verFormat: 6,
    type: 'Resource',
    importmdOfs: 0n,
    flags: 0,
    uid: -1n,
    scriptClass: 'CampaignSave',
    reserved: [],
    stringTable: [],
    externals: [],
    resources,
    usingUids: false
  } as unknown as ResourceWire

  return {
    wire,
    root: {
      player_gold: 1000,
      [FIGHTER_ROSTER_PATH]: [encodeInternalRef(1)]
    }
  }
}

describe('eslabong fighters model', () => {
  it('locks roster path and progress caps from dump comments', () => {
    expect(FIGHTER_ROSTER_PATH).toBe('owned_mercenaries')
    expect(MAX_LEVEL).toBeGreaterThanOrEqual(43)
    expect(MAX_EXP).toBeGreaterThanOrEqual(1380)
    expect(FIGHTER_BIRTH_KEYS.length).toBeGreaterThan(0)
    expect(FIGHTER_GROWTH_BASE_KEYS.length).toBeGreaterThan(0)
    expect(FIGHTER_CAREER_KEYS.length).toBeGreaterThan(0)
    expect(FIGHTER_PERSONALITY_KEYS).toContain('adaptability')
  })

  it('listFighters projects owned_mercenaries into FighterRow', () => {
    const doc = makeFighterDoc()
    const rows = listFighters(doc)
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.id).toBe('merc_001')
    expect(row.displayName).toBe('Test Monk')
    expect(row.configId).toBe('res://Data/Mercenaries/Merc_Monk.tres')
    expect(row.level).toBe(10)
    expect(row.experience).toBe(100)
    expect(row.growthStyles).toEqual(['balanced'])
    expect(row.birth.birth_max_hp).toBe(500)
    expect(row.growthBase.growth_base_damage).toBe(11)
    expect(row.career.career_max_hp).toBe(1125)
    expect(row.skills.skill_01).toBe('res://Data/Abilities/a.tres')
    expect(row.skills.skill_02).toBe('res://Data/Abilities/b.tres')
    expect(row.skills.skill_03).toBe('res://Data/Abilities/c.tres')
    expect(row.injured).toBe(true)
    expect(row.injuryBattlesRemaining).toBe(3)
    expect(row.injuryDescription).toBe('bruised ribs')
    expect(row.equippedItemInstanceIds).toEqual(['item-a', 'item-b'])
    expect(row.personality.adaptability).toBeCloseTo(0.4)
    expect(row.aiProfile.aggression).toBeCloseTo(0.7)
    expect(row._ref).toBeTruthy()
  })

  it('applyFighter mutates level/skill/injury without dropping unknown keys', () => {
    const doc = makeFighterDoc()
    const [row] = listFighters(doc)
    expect(row).toBeTruthy()

    row!.level = 42
    row!.experience = 900
    row!.skills.skill_02 = 'res://Data/Abilities/new.tres'
    row!.injured = false
    row!.injuryBattlesRemaining = 0
    row!.injuryDescription = ''
    row!.personality.adaptability = 2
    row!.aiProfile.aggression = 0.11
    row!.birth.birth_max_hp = 600
    row!.equippedItemInstanceIds = ['item-x', '']

    applyFighter(doc, row!)

    const again = listFighters(doc)[0]!
    expect(again.level).toBe(42)
    expect(again.experience).toBe(900)
    expect(again.skills.skill_02).toBe('res://Data/Abilities/new.tres')
    expect(again.injured).toBe(false)
    expect(again.injuryBattlesRemaining).toBe(0)
    expect(again.injuryDescription).toBe('')
    expect(again.personality.adaptability).toBe(1)
    expect(again.aiProfile.aggression).toBeCloseTo(0.11)
    expect(again.birth.birth_max_hp).toBe(600)
    expect(again.equippedItemInstanceIds).toEqual(['item-x', ''])

    const fighter = doc.wire.resources[1]!
    const opaque = fighter.properties.find((p) => p.name === 'opaque_extra')
    expect(opaque?.value).toEqual({ kind: 'string', value: 'keep-me' })
    const battles = fighter.properties.find((p) => p.name === 'battles_played')
    expect(battles?.value).toEqual({ kind: 'int', value: 29 })
    const ai = doc.wire.resources[0]!
    const opaqueAi = ai.properties.find((p) => p.name === 'opaque_ai_flag')
    expect(opaqueAi?.value).toEqual({ kind: 'bool', value: true })

    // hotkey slots stay in sync with active_abilities when present
    const hotkeys = fighter.properties.find((p) => p.name === 'ability_hotkey_slots')
    expect(hotkeys?.value).toMatchObject({
      kind: 'array',
      items: [
        { kind: 'string', value: 'res://Data/Abilities/a.tres' },
        { kind: 'string', value: 'res://Data/Abilities/new.tres' },
        { kind: 'string', value: 'res://Data/Abilities/c.tres' }
      ]
    })
  })

  it('clearInjury and maxProgress mutate the row only', () => {
    const doc = makeFighterDoc()
    const [row] = listFighters(doc)
    clearInjury(row!)
    expect(row!.injured).toBe(false)
    expect(row!.injuryBattlesRemaining).toBe(0)
    expect(row!.injuryDescription).toBe('')
    // not applied yet
    expect(listFighters(doc)[0]!.injured).toBe(true)

    maxProgress(row!, { maxLevel: MAX_LEVEL, maxExp: MAX_EXP })
    expect(row!.level).toBe(MAX_LEVEL)
    expect(row!.experience).toBe(MAX_EXP)

    applyFighter(doc, row!)
    const again = listFighters(doc)[0]!
    expect(again.injured).toBe(false)
    expect(again.level).toBe(MAX_LEVEL)
    expect(again.experience).toBe(MAX_EXP)
  })
})

const realRes =
  process.env.ESLABONG_RES ||
  join(process.env.APPDATA ?? '', 'Godot/app_userdata/Eslabong/campaign_save_2.res')

describe.skipIf(!existsSync(realRes))('eslabong fighters real-save smoke', () => {
  it('lists owned_mercenaries with expected field shapes', async () => {
    const plain = await decompressRscc(new Uint8Array(readFileSync(realRes)))
    const doc = parseResourceBinary(plain)
    const rows = listFighters(doc)
    expect(rows.length).toBeGreaterThan(0)
    const sample = rows[0]!
    expect(sample.id.length).toBeGreaterThan(0)
    expect(typeof sample.level).toBe('number')
    expect(typeof sample.experience).toBe('number')
    expect(Object.keys(sample.skills).length).toBeGreaterThan(0)
    expect(typeof sample.injured).toBe('boolean')
  })
})
