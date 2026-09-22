import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ITEM_DEFINITION_ID_KEY,
  ITEM_EQUIPPED_FIGHTER_KEY,
  ITEM_EQUIPPED_SLOT_KEY,
  ITEM_EXCEPTIONAL_ROLL_KEY,
  ITEM_INSTANCE_ID_KEY,
  ITEM_QUALITY_KEY,
  ITEM_ROLLED_MODIFIERS_KEY,
  ITEM_ROSTER_PATH,
  ITEM_STATS_KEY
} from '../../src/games/eslabong/model/fields'
import { applyItem, listOwnedItems } from '../../src/games/eslabong/model/items'
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

/** Synthetic item with quality + rolled_modifiers (mirrors dump + optional quality for editor). */
function makeItemDoc(): ResourceDoc {
  const itemProps: PropWire[] = [
    prop(ITEM_INSTANCE_ID_KEY, { kind: 'string', value: 'item-uuid-001' }),
    prop(ITEM_DEFINITION_ID_KEY, { kind: 'string', value: 'REL_R_023' }),
    prop(ITEM_QUALITY_KEY, { kind: 'string', value: 'rare' }),
    prop(ITEM_EXCEPTIONAL_ROLL_KEY, { kind: 'bool', value: false }),
    prop(ITEM_ROLLED_MODIFIERS_KEY, {
      kind: 'dict',
      entries: [
        { key: { kind: 'string', value: 'hp_flat' }, value: { kind: 'int', value: 47 } },
        {
          key: { kind: 'string', value: 'basic_melee_damage_taken_perc' },
          value: { kind: 'int', value: -16 }
        }
      ]
    }),
    prop('opaque_extra', { kind: 'string', value: 'keep-me' }),
    prop('inventory_slot', { kind: 'int', value: 3 }),
    prop(ITEM_EQUIPPED_FIGHTER_KEY, { kind: 'string', value: 'merc_001' }),
    prop(ITEM_EQUIPPED_SLOT_KEY, { kind: 'int', value: 0 })
  ]

  const resources = [
    {
      path: 'local://item_0',
      type: 'Resource',
      properties: itemProps
    },
    {
      path: 'user://campaign.res',
      type: 'Resource',
      properties: [
        prop('player_gold', { kind: 'int', value: 1000 }),
        prop(ITEM_ROSTER_PATH, {
          kind: 'array',
          items: [
            {
              kind: 'object',
              objType: OBJECT_INTERNAL_RESOURCE,
              index: 0
            }
          ]
        }),
        // market must not be listed
        prop('market_listings', {
          kind: 'array',
          items: [
            {
              kind: 'object',
              objType: OBJECT_INTERNAL_RESOURCE,
              index: 0
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
      [ITEM_ROSTER_PATH]: [encodeInternalRef(0)],
      market_listings: [encodeInternalRef(0)]
    }
  }
}

describe('eslabong items model', () => {
  it('locks owned-items roster path (not market_listings)', () => {
    expect(ITEM_ROSTER_PATH).toBe('owned_item_instances')
    expect(ITEM_ROSTER_PATH).not.toBe('market_listings')
    expect(ITEM_INSTANCE_ID_KEY).toBe('instance_id')
    expect(ITEM_DEFINITION_ID_KEY).toBe('definition_id')
    expect(ITEM_QUALITY_KEY).toBe('quality')
    expect(ITEM_EXCEPTIONAL_ROLL_KEY).toBe('exceptional_roll')
    expect(ITEM_ROLLED_MODIFIERS_KEY).toBe('rolled_modifiers')
    expect(ITEM_STATS_KEY).toBe('stats')
  })

  it('listOwnedItems projects owned_item_instances only', () => {
    const doc = makeItemDoc()
    const rows = listOwnedItems(doc)
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.instanceId).toBe('item-uuid-001')
    expect(row.definitionId).toBe('REL_R_023')
    expect(row.quality).toBe('rare')
    expect(row.exceptionalRoll).toBe(false)
    expect(row.rolledModifiers).toMatchObject({
      hp_flat: 47,
      basic_melee_damage_taken_perc: -16
    })
    expect(row.stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ statId: 'hp_flat', amount: 47 }),
        expect.objectContaining({ statId: 'basic_melee_damage_taken_perc', amount: -16 })
      ])
    )
    expect(row.stats).toHaveLength(2)
    expect(row.equippedFighterId).toBe('merc_001')
    expect(row.equippedSlot).toBe(0)
    expect(row._ref).toBeTruthy()
  })

  it('applyItem edits quality + one stat amount without dropping unknown keys', () => {
    const doc = makeItemDoc()
    const [row] = listOwnedItems(doc)
    expect(row).toBeTruthy()

    row!.quality = 'legendary'
    row!.definitionId = 'REL_L_008'
    row!.exceptionalRoll = true
    const hp = row!.stats.find((s) => s.statId === 'hp_flat')
    expect(hp).toBeTruthy()
    hp!.amount = 99

    applyItem(doc, row!)

    const again = listOwnedItems(doc)[0]!
    expect(again.quality).toBe('legendary')
    expect(again.definitionId).toBe('REL_L_008')
    expect(again.exceptionalRoll).toBe(true)
    expect(again.stats.find((s) => s.statId === 'hp_flat')!.amount).toBe(99)
    expect(again.rolledModifiers).toMatchObject({
      hp_flat: 99,
      basic_melee_damage_taken_perc: -16
    })

    const item = doc.wire.resources[0]!
    const opaque = item.properties.find((p) => p.name === 'opaque_extra')
    expect(opaque?.value).toEqual({ kind: 'string', value: 'keep-me' })
    const slot = item.properties.find((p) => p.name === 'inventory_slot')
    expect(slot?.value).toEqual({ kind: 'int', value: 3 })
  })

  it('applyItem clamps stat amounts on write', () => {
    const doc = makeItemDoc()
    const [row] = listOwnedItems(doc)
    const hp = row!.stats.find((s) => s.statId === 'hp_flat')!
    hp.amount = 9999
    applyItem(doc, row!)
    expect(listOwnedItems(doc)[0]!.stats.find((s) => s.statId === 'hp_flat')!.amount).toBe(200)
  })
})

const realRes =
  process.env.ESLABONG_RES ||
  join(process.env.APPDATA ?? '', 'Godot/app_userdata/Eslabong/campaign_save_2.res')

describe.skipIf(!existsSync(realRes))('eslabong items real-save smoke', () => {
  it('lists owned_item_instances with rolled_modifiers projected as stats', async () => {
    const plain = await decompressRscc(new Uint8Array(readFileSync(realRes)))
    const doc = parseResourceBinary(plain)
    const rows = listOwnedItems(doc)
    expect(rows.length).toBeGreaterThan(0)
    const sample = rows[0]!
    expect(sample.instanceId.length).toBeGreaterThan(0)
    expect(sample.definitionId.length).toBeGreaterThan(0)
    expect(typeof sample.rolledModifiers).toBe('object')
    expect(sample.stats.length).toBeGreaterThan(0)
    expect(typeof sample.stats[0]!.statId).toBe('string')
    expect(typeof sample.stats[0]!.amount).toBe('number')
  })
})
