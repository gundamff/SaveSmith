import { describe, expect, it } from 'vitest'
import { collectCatalog } from '../../src/games/eslabong/catalog/fromSave'
import {
  classLabel,
  definitionLabel,
  fieldLabel,
  formatStatsSummary,
  growthStyleLabel,
  skillLabel
} from '../../src/games/eslabong/catalog/labels'
import {
  ITEM_DEFINITION_ID_KEY,
  ITEM_INSTANCE_ID_KEY,
  ITEM_QUALITY_KEY,
  ITEM_ROLLED_MODIFIERS_KEY,
  ITEM_ROSTER_PATH,
  ITEM_STATS_KEY,
  FIGHTER_ROSTER_PATH
} from '../../src/games/eslabong/model/fields'
import type { PropWire, ResourceDoc, ResourceWire } from '../../src/games/eslabong/resource/binary'
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

function makeDoc(): ResourceDoc {
  const aiProps: PropWire[] = [prop('adaptability', { kind: 'double', value: 0.4 })]

  const fighterProps: PropWire[] = [
    prop('instance_id', { kind: 'string', value: 'merc_001' }),
    prop('display_name', { kind: 'string', value: 'Monk' }),
    prop('config_id', {
      kind: 'string',
      value: 'res://Data/Mercenaries/Merc_Monk.tres'
    }),
    prop('level', { kind: 'int', value: 10 }),
    prop('experience', { kind: 'int', value: 100 }),
    prop('growth_styles', { kind: 'array', items: [{ kind: 'string', value: 'balanced' }] }),
    prop('active_abilities', {
      kind: 'array',
      items: [
        { kind: 'string', value: 'res://Data/Abilities/a.tres' },
        { kind: 'string', value: 'res://Data/Abilities/b.tres' },
        { kind: 'string', value: 'res://Data/Abilities/a.tres' }
      ]
    }),
    prop('ai_profile_override', {
      kind: 'object',
      objType: OBJECT_INTERNAL_RESOURCE,
      index: 0
    }),
    prop('is_injured', { kind: 'bool', value: false }),
    prop('injury_battles_remaining', { kind: 'int', value: 0 }),
    prop('injury_description', { kind: 'string', value: '' })
  ]

  const itemA: PropWire[] = [
    prop(ITEM_INSTANCE_ID_KEY, { kind: 'string', value: 'item-1' }),
    prop(ITEM_DEFINITION_ID_KEY, { kind: 'string', value: 'REL_R_023' }),
    prop(ITEM_QUALITY_KEY, { kind: 'string', value: 'rare' }),
    prop(ITEM_ROLLED_MODIFIERS_KEY, {
      kind: 'dict',
      entries: [
        { key: { kind: 'string', value: 'hp_flat' }, value: { kind: 'int', value: 47 } },
        {
          key: { kind: 'string', value: 'basic_melee_damage_taken_perc' },
          value: { kind: 'int', value: -16 }
        }
      ]
    })
  ]

  const itemB: PropWire[] = [
    prop(ITEM_INSTANCE_ID_KEY, { kind: 'string', value: 'item-2' }),
    prop(ITEM_DEFINITION_ID_KEY, { kind: 'string', value: 'REL_R_001' }),
    prop(ITEM_QUALITY_KEY, { kind: 'string', value: 'common' }),
    prop(ITEM_STATS_KEY, {
      kind: 'array',
      items: [
        {
          kind: 'dict',
          entries: [
            { key: { kind: 'string', value: 'stat_id' }, value: { kind: 'string', value: 'atk_flat' } },
            { key: { kind: 'string', value: 'amount' }, value: { kind: 'int', value: 3 } },
            { key: { kind: 'string', value: 'ratio' }, value: { kind: 'double', value: 0.1 } }
          ]
        }
      ]
    }),
    prop(ITEM_ROLLED_MODIFIERS_KEY, {
      kind: 'dict',
      entries: []
    })
  ]

  const resources = [
    { path: 'local://ai_0', type: 'Resource', properties: aiProps },
    { path: 'local://fighter_0', type: 'Resource', properties: fighterProps },
    { path: 'local://item_0', type: 'Resource', properties: itemA },
    { path: 'local://item_1', type: 'Resource', properties: itemB },
    {
      path: 'user://campaign.res',
      type: 'Resource',
      properties: [
        prop('player_gold', { kind: 'int', value: 100 }),
        prop(FIGHTER_ROSTER_PATH, {
          kind: 'array',
          items: [{ kind: 'object', objType: OBJECT_INTERNAL_RESOURCE, index: 1 }]
        }),
        prop(ITEM_ROSTER_PATH, {
          kind: 'array',
          items: [
            { kind: 'object', objType: OBJECT_INTERNAL_RESOURCE, index: 2 },
            { kind: 'object', objType: OBJECT_INTERNAL_RESOURCE, index: 3 }
          ]
        })
      ]
    }
  ]

  const wire: ResourceWire = {
    bigEndian: 0,
    useReal64: 0,
    verMajor: 4,
    verMinor: 0,
    verFormat: 0,
    type: 'Resource',
    importmdOfs: 0n,
    flags: 0,
    uid: 0n,
    scriptClass: null,
    reserved: [],
    stringTable: [],
    externals: [],
    resources,
    usingUids: false
  }

  return {
    wire,
    root: {
      player_gold: 100,
      [FIGHTER_ROSTER_PATH]: [encodeInternalRef(1)],
      [ITEM_ROSTER_PATH]: [encodeInternalRef(2), encodeInternalRef(3)]
    }
  }
}

describe('collectCatalog', () => {
  it('collects unique skills, definitions, qualities, and statIds from current save', () => {
    const catalog = collectCatalog(makeDoc())
    expect(catalog.skills).toEqual([
      'res://Data/Abilities/a.tres',
      'res://Data/Abilities/b.tres'
    ])
    expect(catalog.definitions.sort()).toEqual(['REL_R_001', 'REL_R_023'])
    expect(catalog.qualities.sort()).toEqual(['common', 'rare'])
    expect(catalog.statIds.sort()).toEqual([
      'atk_flat',
      'basic_melee_damage_taken_perc',
      'hp_flat'
    ])
  })

  it('returns empty arrays when roster paths are missing', () => {
    const catalog = collectCatalog({
      wire: {
        bigEndian: 0,
        useReal64: 0,
        verMajor: 4,
        verMinor: 0,
        verFormat: 0,
        type: 'Resource',
        importmdOfs: 0n,
        flags: 0,
        uid: 0n,
        scriptClass: null,
        reserved: [],
        stringTable: [],
        externals: [],
        resources: [],
        usingUids: false
      },
      root: {}
    })
    expect(catalog.skills).toEqual([])
    expect(catalog.definitions).toEqual([])
    expect(catalog.qualities).toEqual([])
    expect(catalog.statIds).toEqual([])
    expect(catalog.labels.definitions).toEqual({})
    expect(catalog.labels.classes).toEqual({})
  })
})

describe('eslabong labels', () => {
  it('maps fighter fields / growth / class / skills to zh', () => {
    expect(fieldLabel('birth_max_hp')).toBe('出生生命')
    expect(fieldLabel('adaptability')).toBe('适应力')
    expect(fieldLabel('hp_flat')).toBe('生命(固定)')
    expect(growthStyleLabel('balanced')).toBe('均衡')
    expect(growthStyleLabel('damage_excellent')).toBe('伤害(卓越)')
    expect(classLabel('res://Data/Mercenaries/Merc_Monk.tres')).toBe('武僧')
    expect(classLabel('res://Data/Mercenaries/Champions/Named_Champion_AboBro.tres')).toBe(
      '冠军'
    )
    expect(skillLabel('res://Data/Abilities/Basic/slash_monk.tres')).toBe('武僧劈砍')
    expect(skillLabel('res://Data/Abilities/Basic/fireball.tres')).toBe('火球术')
    expect(skillLabel('res://Data/Abilities/Heal/holy_light.tres')).toBe('圣光')
  })

  it('uses save-extracted definition labels when present', () => {
    expect(
      definitionLabel('REL_R_023', {
        definitions: { REL_R_023: 'Ironhide Cuirass' },
        skills: {},
        classes: {}
      })
    ).toBe('铁皮胸甲')
    expect(definitionLabel('REL_UNKNOWN')).toBe('REL_UNKNOWN')
  })

  it('formats rolled stats for list cells', () => {
    expect(formatStatsSummary([])).toBe('')
    expect(
      formatStatsSummary([
        { statId: 'hp_flat', amount: 47 },
        { statId: 'basic_melee_damage_taken_perc', amount: -16 }
      ])
    ).toBe('生命(固定)+47 · 近战普攻受伤(%)-16')
  })
})
