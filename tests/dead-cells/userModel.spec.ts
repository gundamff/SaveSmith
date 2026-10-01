import { describe, expect, it } from 'vitest'
import { decodeHxs, encodeHxs } from '../../src/games/dead-cells/model/hxbit'
import {
  projectUser,
  setBossRushUnlock,
  setDeathCells,
  setDeathMoney,
  setHeroHeadSkin,
  setHeroSkin,
  setItemInvestedCells,
  setItemIsNew,
  setItemUnlocked,
  setRune
} from '../../src/games/dead-cells/model/userModel'
import { buildUserChunk } from './fixtures'

describe('dead-cells userModel', () => {
  it('projects resources, items, stats, skins and boss rush', () => {
    const doc = decodeHxs(buildUserChunk(), 'User')
    const view = projectUser(doc)
    expect(view.editable).toBe(true)
    expect(view.deathMoney).toBe(100)
    expect(view.deathCells).toBe(5)
    expect(view.heroSkin).toBe('default')
    expect(view.heroHeadSkin).toBe('head0')
    expect(view.items).toHaveLength(2)
    expect(view.items[0]).toMatchObject({
      itemId: 'sword',
      investedCells: 3,
      isNew: true,
      unlocked: false
    })
    expect(view.items[1]).toMatchObject({ itemId: 'bow', unlocked: true })
    expect(view.bossRush).toEqual([
      { field: 'unlockedGameMode', idx: 0, unlock: true },
      { field: 'unlockedGameMode', idx: 1, unlock: false }
    ])
    expect(view.runes.every((r) => !r.enabled)).toBe(true)
    expect(view.runes.map((r) => r.id)).toContain('LadderKey')
  })

  it('edits round-trip through encode/decode', () => {
    const doc = decodeHxs(buildUserChunk(), 'User')
    setDeathMoney(doc, 99999)
    setDeathCells(doc, 500)
    setItemUnlocked(doc, 0, true)
    setItemInvestedCells(doc, 0, 20)
    setItemIsNew(doc, 0, false)
    setHeroSkin(doc, 'vampire')
    setHeroHeadSkin(doc, 'head9')
    setBossRushUnlock(doc, 'unlockedGameMode', 1, true)

    const out = encodeHxs(doc)
    const again = decodeHxs(out, 'User')
    const view = projectUser(again)
    expect(view.deathMoney).toBe(99999)
    expect(view.deathCells).toBe(500)
    expect(view.items[0]).toMatchObject({
      itemId: 'sword',
      investedCells: 20,
      isNew: false,
      unlocked: true
    })
    expect(view.heroSkin).toBe('vampire')
    expect(view.heroHeadSkin).toBe('head9')
    expect(view.bossRush[1]).toMatchObject({ idx: 1, unlock: true })
    // untouched item preserved
    expect(view.items[1]).toMatchObject({ itemId: 'bow', investedCells: 0, unlocked: true })
  })

  it('unedited chunk stays byte-identical', () => {
    const original = buildUserChunk()
    const doc = decodeHxs(original, 'User')
    projectUser(doc) // read-only projection must not dirty anything
    expect(encodeHxs(doc)).toEqual(original)
  })

  it('unlocks and clears runes across the meta item arrays', () => {
    const original = buildUserChunk({ metaItems: ['LadderKey'], permanentItems: ['TeleportKey'] })
    const doc = decodeHxs(original, 'User')
    const before = projectUser(doc)
    expect(before.runes.find((r) => r.id === 'LadderKey')?.enabled).toBe(true)
    expect(before.runes.find((r) => r.id === 'TeleportKey')?.enabled).toBe(true)
    expect(before.runes.find((r) => r.id === 'WallJumpKey')?.enabled).toBe(false)

    setRune(doc, 'WallJumpKey', true)
    setRune(doc, 'LadderKey', false)
    const out = encodeHxs(doc)
    const again = decodeHxs(out, 'User')
    const view = projectUser(again)
    expect(view.runes.find((r) => r.id === 'WallJumpKey')?.enabled).toBe(true)
    expect(view.runes.find((r) => r.id === 'LadderKey')?.enabled).toBe(false)
    expect(view.runes.find((r) => r.id === 'TeleportKey')?.enabled).toBe(true)
    // unrelated edits survive
    expect(view.deathMoney).toBe(100)
  })

  it('unmodified rune chunk round-trips byte-identical', () => {
    const original = buildUserChunk({ metaItems: ['LadderKey'], permanentItems: ['TeleportKey'] })
    const doc = decodeHxs(original, 'User')
    projectUser(doc)
    expect(encodeHxs(doc)).toEqual(original)
  })

  it('reports non-editable when opaque', () => {
    const raw = buildUserChunk()
    const truncated = raw.slice(0, raw.length - 8)
    const doc = decodeHxs(truncated, 'User')
    const view = projectUser(doc)
    expect(view.editable).toBe(false)
  })
})
