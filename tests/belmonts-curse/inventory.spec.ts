import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { catalogReady } from '../../src/games/belmonts-curse/catalog/ready'
import { lookupItemName } from '../../src/games/belmonts-curse/catalog/names'
import { featureFlags } from '../../src/games/belmonts-curse/model/featureFlags'
import {
  catalogAddableIdsByCategory,
  getItemCategory
} from '../../src/games/belmonts-curse/catalog/names'
import {
  addAllOfCategory,
  addItem,
  removeItem,
  setEquippedCharm,
  setEquippedSkin,
  setEquippedWeapon
} from '../../src/games/belmonts-curse/model/inventory'
import { parse, serialize, validate } from '../../src/games/belmonts-curse/parse'
import { utf8Encode } from '../../src/sdk/session'

const root = join(dirname(fileURLToPath(import.meta.url)))
const fixture = JSON.parse(
  readFileSync(join(root, 'fixtures/minimal-buildsave.json'), 'utf8')
) as Record<string, unknown>

function loadState() {
  const bytes = utf8Encode(JSON.stringify(structuredClone(fixture)))
  return parse([{ relativePath: 'BuildSave_0.sav', bytes }])
}

describe('belmonts-curse catalog', () => {
  it('catalogReady passes with shipped items.json', () => {
    expect(catalogReady()).toBe(true)
    expect(featureFlags.addItem).toBe(true)
    expect(lookupItemName('WeaponFistTier1', 'en')).toMatch(/Cestus/i)
    expect(lookupItemName('WeaponFistTier1', 'zh')).toBeTruthy()
    expect(lookupItemName('WeaponFistTier1', 'zh')).not.toBe('WeaponFistTier1')
  })

  it('lookup falls back to id when missing', () => {
    expect(lookupItemName('DefinitelyMissing_XYZ', 'zh')).toBe('DefinitelyMissing_XYZ')
  })
})

describe('belmonts-curse inventory mutators', () => {
  it('addItem dedupes', () => {
    const state = loadState()
    addItem(state, 'WeaponFistTier1')
    expect(state.player.itemsInInventory.filter((x) => x === 'WeaponFistTier1')).toHaveLength(1)
    addItem(state, 'Charm_BatPet')
    expect(state.player.itemsInInventory).toContain('Charm_BatPet')
    const n = state.player.itemsInInventory.length
    addItem(state, 'Charm_BatPet')
    expect(state.player.itemsInInventory).toHaveLength(n)
  })

  it('removeItem retargets weapon and prefers Skin_MC_Base for skin', () => {
    const state = loadState()
    addItem(state, 'WeaponSpear')
    setEquippedWeapon(state, 'WeaponSpear')
    removeItem(state, 'WeaponSpear')
    expect(state.player.itemsInInventory).not.toContain('WeaponSpear')
    expect(state.player.equippedWeaponItem).toBe('WeaponFistTier1')

    addItem(state, 'Skin_MC_Base')
    addItem(state, 'Skin_MC_Alucard')
    setEquippedSkin(state, 'Skin_MC_Alucard')
    removeItem(state, 'Skin_MC_Alucard')
    expect(state.player.equippedSkin).toBe('Skin_MC_Base')
  })

  it('setEquippedCharm allows empty; ignores non-owned', () => {
    const state = loadState()
    setEquippedCharm(state, 0, '')
    expect(state.player.equippedCharmItems[0]).toBe('')
    setEquippedCharm(state, 0, 'NotOwnedCharm')
    expect(state.player.equippedCharmItems[0]).toBe('')
    addItem(state, 'Charm_ChestRecover')
    setEquippedCharm(state, 0, 'Charm_ChestRecover')
    expect(state.player.equippedCharmItems[0]).toBe('Charm_ChestRecover')
  })

  it('validate reports BC_INV_DUP and BC_EQUIP_ORPHAN', () => {
    const state = loadState()
    const ps = state.raw.playerSave as Record<string, unknown>
    ps.itemsInInventory = ['A', 'A']
    ps.equippedWeaponItem = 'Ghost'
    const again = parse([{ relativePath: state.relativePath, bytes: serialize(state)[0]!.bytes }])
    const codes = validate(again).map((i) => i.code)
    expect(codes).toContain('BC_INV_DUP')
    expect(codes).toContain('BC_EQUIP_ORPHAN')
  })

  it('addAllOfCategory adds missing ids and is idempotent', () => {
    const state = loadState()
    const before = state.player.itemsInInventory.length
    const expected = catalogAddableIdsByCategory('charm')
    const added = addAllOfCategory(state, 'charm')
    expect(added).toBeGreaterThan(0)
    expect(state.player.itemsInInventory.filter((id) => getItemCategory(id) === 'charm')).toHaveLength(
      expected.length
    )
    expect(state.player.itemsInInventory.length).toBe(before + added)
    expect(addAllOfCategory(state, 'charm')).toBe(0)
    expect(addAllOfCategory(state, 'clue')).toBe(0)
  })
})
