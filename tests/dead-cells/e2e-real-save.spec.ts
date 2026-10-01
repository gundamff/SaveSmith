import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  buildContainer,
  getChunk,
  parseContainer,
  verifyChecksum
} from '../../src/games/dead-cells/model/container'
import {
  asArray,
  asObject,
  asString,
  decodeHxs,
  encodeHxs,
  setIntValue
} from '../../src/games/dead-cells/model/hxbit'
import { projectUser, setItemUnlocked } from '../../src/games/dead-cells/model/userModel'
import { itemDisplayName, hasItemName } from '../../src/games/dead-cells/model/itemNames'
import { parse as parseSave, validate } from '../../src/games/dead-cells/parse'

const SAVE = process.env.DC_SAVE

describe.skipIf(!SAVE)('dead-cells real save (DC_SAVE)', () => {
  it('parses the container and S_User root', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    await expect(verifyChecksum(raw)).resolves.toBe(true)
    const container = await parseContainer(raw)
    expect(container.header.version).toBe(1)
    const user = getChunk(container, 'S_User')
    expect(user).toBeDefined()
    const doc = decodeHxs(user!.data, 'User')
    expect(doc.opaque).toBe(false)
    const root = doc.root!
    expect(root.className).toBe('User')
    // deathMoney / deathCells must be present as ints
    const money = root.fields.get('deathMoney')
    expect(money?.kind).toBe('int')
    const cells = root.fields.get('deathCells')
    expect(cells?.kind).toBe('int')
    // itemMeta -> itemProgress array of tool.ItemProgress
    const itemMeta = asObject(root.fields.get('itemMeta'))
    expect(itemMeta).not.toBeNull()
  })

  it('S_User round-trips byte-identical when unedited', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const container = await parseContainer(raw)
    const user = getChunk(container, 'S_User')!
    const doc = decodeHxs(user.data, 'User')
    const out = encodeHxs(doc)
    expect(out).toEqual(user.data)
  })

  it('full-container round-trip preserves decompressed chunks', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const container = await parseContainer(raw)
    const rebuilt = await buildContainer(container)
    await expect(verifyChecksum(rebuilt)).resolves.toBe(true)
    const again = await parseContainer(rebuilt)
    expect(again.chunks.map((c) => c.data)).toEqual(container.chunks.map((c) => c.data))
    expect(again.chunks.map((c) => c.name)).toEqual(container.chunks.map((c) => c.name))
  })

  it('survives an edit -> write -> restore cycle on a temp copy', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const container = await parseContainer(raw)
    const user = getChunk(container, 'S_User')!
    const doc = decodeHxs(user.data, 'User')
    const root = doc.root!
    const gold = root.fields.get('deathMoney')
    expect(gold?.kind).toBe('int')
    const originalGold = gold!.kind === 'int' ? gold!.value : -1
    // bump gold by 1
    if (gold?.kind === 'int') setIntValue(doc, gold, originalGold + 1)
    const editedChunk = encodeHxs(doc)
    expect(editedChunk).not.toEqual(user.data)
    const parsed = decodeHxs(editedChunk, 'User')
    const gold2 = parsed.root!.fields.get('deathMoney')
    expect(gold2?.kind).toBe('int')
    if (gold2?.kind === 'int') expect(gold2.value).toBe(originalGold + 1)
    // assemble full container and verify checksum + round-trip parse
    const editedContainer = {
      header: container.header,
      chunks: container.chunks.map((c) => (c.name === 'S_User' ? { ...c, data: editedChunk } : c))
    }
    const out = await buildContainer(editedContainer)
    await expect(verifyChecksum(out)).resolves.toBe(true)
    const final = await parseContainer(out)
    const finalUser = decodeHxs(getChunk(final, 'S_User')!.data, 'User')
    const finalGold = finalUser.root!.fields.get('deathMoney')
    if (finalGold?.kind === 'int') expect(finalGold.value).toBe(originalGold + 1)
    // untouched chunk identical
    expect(getChunk(final, 'S_Game')?.data).toEqual(getChunk(container, 'S_Game')?.data)
  })

  it('itemProgress entries are reachable', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const container = await parseContainer(raw)
    const doc = decodeHxs(getChunk(container, 'S_User')!.data, 'User')
    const itemMeta = asObject(doc.root!.fields.get('itemMeta'))
    expect(itemMeta).not.toBeNull()
    const progress = asArray(itemMeta!.fields.get('itemProgress'))
    expect(progress).not.toBeNull()
    if (progress) {
      expect(progress.length).toBeGreaterThan(0)
      const first = asObject(progress[0]!)
      expect(asString(first!.fields.get('itemId'))).toBeTruthy()
    }
  })

  it('userModel projects and edits the real save', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const container = await parseContainer(raw)
    const user = getChunk(container, 'S_User')!
    const doc = decodeHxs(user.data, 'User')
    const view = projectUser(doc)
    expect(view.editable).toBe(true)
    expect(view.items.length).toBeGreaterThan(0)
    // round-trip projection must stay byte-identical
    expect(encodeHxs(doc)).toEqual(user.data)
    // edit one item and verify
    const target = view.items.find((i) => !i.unlocked) ?? view.items[0]!
    setItemUnlocked(doc, target.index, !target.unlocked)
    const out = encodeHxs(doc)
    const again = projectUser(decodeHxs(out, 'User'))
    const after = again.items.find((i) => i.index === target.index)!
    expect(after.unlocked).toBe(!target.unlocked)
  })

  it('validate passes on the real save despite negative item sentinels', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const state = await parseSave([{ relativePath: 'user_0.dat', bytes: raw }])
    expect(validate(state)).toEqual([])
  })

  it('maps every itemProgress id to a display name (mostly Chinese)', async () => {
    const raw = new Uint8Array(readFileSync(SAVE!))
    const container = await parseContainer(raw)
    const view = projectUser(decodeHxs(getChunk(container, 'S_User')!.data, 'User'))
    const missing = view.items.filter((i) => !hasItemName(i.itemId))
    expect(missing.map((i) => i.itemId)).toEqual([])
    const named = view.items.map((i) => itemDisplayName(i.itemId, 'zh'))
    expect(named.every((n) => n.length > 0)).toBe(true)
    // at least one item should be an actual Chinese string, not the raw id
    expect(named.some((n) => /[\u4e00-\u9fff]/.test(n))).toBe(true)
  })
})
