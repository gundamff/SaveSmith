import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { PhantomBladeZeroState } from '../../src/games/phantom-blade-zero/parse'
import {
  createSaveModel,
  type PbzEditableSlot
} from '../../src/games/phantom-blade-zero/model/saveModel'
import { usePbzEditor } from '../../src/games/phantom-blade-zero/views/inject'
import { requestSlotSelection } from '../../src/games/phantom-blade-zero/views/slotSelection'
import { pbzViews } from '../../src/games/phantom-blade-zero/views'

const SRC = join(__dirname, '../../src')

function slot(name: string, dirty = false): PbzEditableSlot {
  return {
    name,
    dirty,
    document: {
      Player: { Dust: 10 },
      Inventory: {
        InventoryInfos: {
          Weapon_Material_01: { CurrentAmount: 2, MaxAmount: 3 }
        }
      }
    }
  }
}

function stateWith(model = createSaveModel([slot('AutoSave1')])): PhantomBladeZeroState {
  return {
    relativePath: 'PBZSaveGame.sav',
    container: { outerHeader: new Uint8Array(), directoryBlock: new Uint8Array(), slots: [] },
    model
  }
}

describe('usePbzEditor', () => {
  it('throws PBZ_EDITOR_INJECT when provide is missing', () => {
    const app = createApp({ setup() { return () => null } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => app.runWithContext(() => usePbzEditor())).toThrow('PBZ_EDITOR_INJECT')
      expect(warn.mock.calls.map(([message]) => message)).toEqual([
        '[Vue warn]: injection "savesmithState" not found.',
        '[Vue warn]: injection "savesmithMutate" not found.',
        '[Vue warn]: injection "savesmithRev" not found.'
      ])
    } finally {
      warn.mockRestore()
    }
  })

  it('tracks the latest state and markDirty calls mutate exactly once', () => {
    let current = stateWith()
    const next = stateWith()
    let mutateCount = 0
    const app = createApp({ setup() { return () => null } })
    app.provide('savesmithState', () => current)
    app.provide('savesmithMutate', (fn: (value: unknown) => unknown) => {
      mutateCount++
      current = fn(current) as PhantomBladeZeroState
    })
    app.provide('savesmithRev', { value: 0 })

    app.runWithContext(() => {
      const editor = usePbzEditor()
      expect(editor.save).toBe(current)
      current = next
      expect(editor.save).toBe(next)
      editor.markDirty(() => {
        current.model.slots[0]!.dirty = true
      })
      expect(mutateCount).toBe(1)
      expect(current.model.slots[0]!.dirty).toBe(true)
    })
  })
})

describe('PBZ slot selection', () => {
  it('does nothing and does not confirm when selecting the current slot', () => {
    const model = createSaveModel([slot('AutoSave1'), slot('ManualSave2')])
    model.selectedSlotName = 'AutoSave1'
    const confirm = vi.fn(() => true)

    expect(requestSlotSelection(model, 'AutoSave1', confirm)).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(model.selectedSlotName).toBe('AutoSave1')
  })

  it('switches directly from a clean slot', () => {
    const model = createSaveModel([slot('AutoSave1'), slot('ManualSave2')])
    model.selectedSlotName = 'AutoSave1'
    const confirm = vi.fn(() => true)

    expect(requestSlotSelection(model, 'ManualSave2', confirm)).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(model.selectedSlotName).toBe('ManualSave2')
  })

  it('confirms before leaving a dirty slot and retains its edits', () => {
    const dirty = slot('AutoSave1', true)
    ;(dirty.document.Player as Record<string, unknown>).Dust = 88
    const model = createSaveModel([dirty, slot('ManualSave2')])
    model.selectedSlotName = dirty.name
    const confirm = vi.fn(() => true)

    expect(requestSlotSelection(model, 'ManualSave2', confirm)).toBe(true)
    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm.mock.calls[0]![0]).toMatch(/保留|retain/i)
    expect(model.selectedSlotName).toBe('ManualSave2')
    expect(dirty.dirty).toBe(true)
    expect((dirty.document.Player as Record<string, unknown>).Dust).toBe(88)
  })

  it('keeps the current slot and selector value when dirty switch is cancelled', () => {
    const dirty = slot('AutoSave1', true)
    const model = createSaveModel([dirty, slot('ManualSave2')])
    model.selectedSlotName = dirty.name

    expect(requestSlotSelection(model, 'ManualSave2', () => false)).toBe(false)
    expect(model.selectedSlotName).toBe('AutoSave1')
    expect(dirty.dirty).toBe(true)
  })
})

describe('PBZ views', () => {
  it('registers the single resources view', () => {
    expect(pbzViews).toHaveLength(1)
    expect(pbzViews[0]).toMatchObject({ id: 'resources', labelKey: 'pbz.tabs.resources' })
  })

  it('uses reactive projections, whitelisted mutators, and controlled number inputs', () => {
    const text = readFileSync(
      join(SRC, 'games/phantom-blade-zero/views/ResourcesTab.vue'),
      'utf8'
    )
    expect(text).toMatch(/void editor\.rev/)
    expect(text).toMatch(/projectResources/)
    expect(text).toMatch(/setDust/)
    expect(text).toMatch(/setMaterialAmount/)
    expect(text).toMatch(/setAllExistingMaterials/)
    expect(text).toMatch(/markDirty/)
    expect(text).toMatch(/update:model-value|@update:model-value/)
    expect(text).toMatch(/filter/i)
    expect(text).not.toMatch(/v-model\s*=\s*["'][^"']*(document|save|model)/)
    expect(text).not.toMatch(/@tauri|node:fs|from\s+['"]fs['"]/)
  })

  it('switches slots outside markDirty and limits options to editable model slots', () => {
    const text = readFileSync(
      join(SRC, 'games/phantom-blade-zero/views/ResourcesTab.vue'),
      'utf8'
    )
    expect(text).toMatch(/requestSlotSelection/)
    expect(text).toMatch(/selectedSlotName/)
    expect(text).toMatch(/model\.slots/)
    expect(text).toMatch(/AutoSave|isEditableSlotName/)
    expect(text).not.toMatch(/markDirty\([^)]*requestSlotSelection/s)
  })
})
