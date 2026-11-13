import { describe, expect, it } from 'vitest'
import {
  getPbzCodexBookById,
  listPbzCodexBookPages,
  pbzCodexBookName,
  pbzCodexBooks
} from '../../src/games/phantom-blade-zero/catalog/codexBooks'
import {
  getPbzCodexMemoryById,
  listPbzCodexMemoryPetals,
  pbzCodexMemories,
  pbzCodexMemoryName
} from '../../src/games/phantom-blade-zero/catalog/codexMemories'
import {
  clearAllCodexBooks,
  clearAllCodexMemories,
  createSaveModel,
  projectCodexBooks,
  projectCodexMemories,
  setCodexBookOwned,
  setCodexMemoryOwned,
  unlockAllCodexBooks,
  unlockAllCodexMemories,
  type PbzEditableSlot,
  type PbzSaveModel
} from '../../src/games/phantom-blade-zero/model/saveModel'

function slotWithInfos(infos: Record<string, unknown>): PbzEditableSlot {
  return {
    name: 'AutoSave0',
    dirty: false,
    document: {
      Player: { Dust: 0 },
      Inventory: { InventoryInfos: infos },
      PBZGameSystem: { CycleCount: 0 }
    }
  }
}

function modelOf(slot: PbzEditableSlot): PbzSaveModel {
  return createSaveModel([slot], null)
}

describe('pbz literature catalogs', () => {
  it('ships books, pages, flowers and petals from DT_InventoryData', () => {
    expect(pbzCodexBooks.filter((r) => r.kind === 'book')).toHaveLength(22)
    expect(pbzCodexBooks.filter((r) => r.kind === 'page')).toHaveLength(218)
    expect(pbzCodexMemories.filter((r) => r.kind === 'flower')).toHaveLength(37)
    expect(pbzCodexMemories.filter((r) => r.kind === 'petal')).toHaveLength(128)
    expect(getPbzCodexBookById('Book_XC_01')?.zh).toContain('组织')
    expect(pbzCodexBookName(getPbzCodexBookById('Book_XC_01')!, 'en')).toBe('THE ORDER')
    expect(pbzCodexMemoryName(getPbzCodexMemoryById('FA_0201')!, 'zh')).toContain('记忆之花')
  })

  it('links every page to a book and every petal to a flower', () => {
    const bookIds = new Set(pbzCodexBooks.filter((r) => r.kind === 'book').map((r) => r.id))
    const pages = pbzCodexBooks.filter((r) => r.kind === 'page')
    expect(pages.every((p) => bookIds.has(p.parentId))).toBe(true)
    // Book_08 (杀气改造之谜) shows 8 page pips in-game.
    expect(listPbzCodexBookPages('Book_08')).toHaveLength(8)
    expect(listPbzCodexBookPages('Book_CS_01').length).toBeGreaterThan(0)
    expect(listPbzCodexMemoryPetals('FA_0201').every((p) => p.parentId === 'FA_0201')).toBe(true)
  })
})

describe('pbz literature inventory writes', () => {
  it('projects owned books from InventoryInfos and toggles book+pages together', () => {
    const slot = slotWithInfos({
      Book_XC_01: {
        CurrentAmount: 1,
        MaxAmount: 1,
        FirstAddTime: '2026.11.01-20.37.55',
        DirtyTime: '2026.11.01-20.37.55',
        AcquiredCycle: 0
      }
    })
    const model = modelOf(slot)
    const view = projectCodexBooks(slot)
    expect(view.rows.find((r) => r.id === 'Book_XC_01')?.owned).toBe(true)
    expect(view.ownedCount).toBe(1)

    setCodexBookOwned(model, 'AutoSave0', 'Book_XC_01', true)
    expect(slot.dirty).toBe(true)
    const after = projectCodexBooks(slot)
    expect(after.rows.find((r) => r.id === 'Book_XC_01')?.owned).toBe(true)
    expect(listPbzCodexBookPages('Book_XC_01').every((p) => after.rows.find((r) => r.id === p.id)?.owned)).toBe(
      true
    )

    setCodexBookOwned(model, 'AutoSave0', 'Book_XC_01', false)
    const cleared = projectCodexBooks(slot)
    expect(cleared.rows.find((r) => r.id === 'Book_XC_01')?.owned).toBe(false)
    expect(listPbzCodexBookPages('Book_XC_01').every((p) => !cleared.rows.find((r) => r.id === p.id)?.owned)).toBe(
      true
    )
  })

  it('unlocks all memories including petals and clears them', () => {
    const slot = slotWithInfos({})
    const model = modelOf(slot)
    unlockAllCodexMemories(model, 'AutoSave0')
    const view = projectCodexMemories(slot)
    expect(view.ownedCount).toBe(pbzCodexMemories.length)
    expect(view.rows.every((r) => r.owned)).toBe(true)

    clearAllCodexMemories(model, 'AutoSave0')
    expect(projectCodexMemories(slot).ownedCount).toBe(0)
  })

  it('rejects unknown literature ids', () => {
    const slot = slotWithInfos({})
    const model = modelOf(slot)
    expect(() => setCodexBookOwned(model, 'AutoSave0', 'Book_NOT_REAL', true)).toThrow()
    expect(() => setCodexMemoryOwned(model, 'AutoSave0', 'FA_NOT_REAL', true)).toThrow()
  })

  it('unlocks and clears all books', () => {
    const slot = slotWithInfos({})
    const model = modelOf(slot)
    unlockAllCodexBooks(model, 'AutoSave0')
    expect(projectCodexBooks(slot).ownedCount).toBe(pbzCodexBooks.length)
    clearAllCodexBooks(model, 'AutoSave0')
    expect(projectCodexBooks(slot).ownedCount).toBe(0)
  })
})
