import { defineStore } from 'pinia'
import { markRaw, ref, shallowRef, triggerRef } from 'vue'
import { assertSerializeSane, changedFiles, matchSlotFilePatterns } from '@sdk/session'
import type { GameModule, ListedFile, SlotBytes, SlotInfo, ValidationIssue } from '@sdk/types'
import { translateError } from '../i18n'
import {
  deleteBackup,
  listBackups,
  listDirNames,
  listRelativeFilePaths,
  readFileBytes,
  restoreBackup,
  writeAtomic,
  type BackupInfoDto
} from '../tauri'

export interface SessionBackup extends BackupInfoDto {
  relativePath: string
}

export interface SessionIo {
  listDirNames(dir: string): Promise<string[]>
  readFileBytes(dir: string, relativePath: string): Promise<Uint8Array>
  writeAtomic(dir: string, relativePath: string, bytes: Uint8Array): Promise<string>
  listBackups(dir: string, relativePath: string): Promise<BackupInfoDto[]>
  restoreBackup(dir: string, relativePath: string, name: string): Promise<void>
  deleteBackup(dir: string, name: string): Promise<void>
  listRelativeFilePaths?(dir: string, maxDepth?: number): Promise<string[]>
}

const defaultIo: SessionIo = {
  listDirNames,
  readFileBytes,
  writeAtomic,
  listBackups,
  restoreBackup,
  deleteBackup,
  listRelativeFilePaths
}

let sessionIo: SessionIo = defaultIo

export function setSessionIo(next: SessionIo): void {
  sessionIo = next
}

export function resetSessionIo(): void {
  sessionIo = defaultIo
}

function wrapState(value: unknown): unknown {
  if (value !== null && typeof value === 'object') return markRaw(value as object)
  return value
}

async function readIdentifyFiles(dir: string, names: string[], identifyAnyOf: string[]): Promise<ListedFile[]> {
  const present = new Set(names.map((n) => n.toLowerCase()))
  const out: ListedFile[] = []
  const seen = new Set<string>()
  for (const relativePath of identifyAnyOf) {
    if (!relativePath || seen.has(relativePath.toLowerCase())) continue
    seen.add(relativePath.toLowerCase())
    if (!present.has(relativePath.toLowerCase())) {
      out.push({ relativePath, bytes: null })
      continue
    }
    try {
      const bytes = await sessionIo.readFileBytes(dir, relativePath)
      out.push({ relativePath, bytes })
    } catch {
      out.push({ relativePath, bytes: null })
    }
  }
  return out
}

export const useSessionStore = defineStore('session', () => {
  const game = shallowRef<GameModule | null>(null)
  const saveDir = ref('')
  const slots = ref<SlotInfo[]>([])
  const currentSlotId = ref<string | null>(null)
  const state = shallowRef<unknown | null>(null)
  const original = ref<SlotBytes[]>([])
  const dirty = ref(false)
  const backups = ref<SessionBackup[]>([])
  const loadError = ref<string | null>(null)
  /** Bumps on each in-place edit so markRaw save trees still force view re-render. */
  const revision = ref(0)

  function clearDraft(): void {
    currentSlotId.value = null
    state.value = null
    original.value = []
    dirty.value = false
    backups.value = []
    loadError.value = null
    revision.value = 0
  }

  async function refreshSlots(): Promise<void> {
    const mod = game.value
    const dir = saveDir.value
    if (!mod || !dir) {
      slots.value = []
      return
    }
    let names: string[]
    try {
      names = await sessionIo.listDirNames(dir)
    } catch (e) {
      loadError.value = translateError(e)
      slots.value = []
      return
    }
    const files = await readIdentifyFiles(dir, names, mod.locate.identifyAnyOf)
    const patterns = mod.locate.slotFilePatterns
    if (patterns?.length && sessionIo.listRelativeFilePaths) {
      try {
        const all = await sessionIo.listRelativeFilePaths(dir, 6)
        const matched = matchSlotFilePatterns(all, patterns)
        const existing = new Set(files.map((f) => f.relativePath.toLowerCase()))
        for (const relativePath of matched) {
          if (existing.has(relativePath.toLowerCase())) continue
          existing.add(relativePath.toLowerCase())
          try {
            const bytes = await sessionIo.readFileBytes(dir, relativePath)
            files.push({ relativePath, bytes })
          } catch {
            files.push({ relativePath, bytes: null })
          }
        }
      } catch (e) {
        loadError.value = translateError(e)
        slots.value = []
        return
      }
    }
    slots.value = mod.listSlots({ dir, files })
  }

  async function refreshBackups(sessionFiles: string[]): Promise<void> {
    const dir = saveDir.value
    const merged: SessionBackup[] = []
    for (const relativePath of sessionFiles) {
      try {
        const list = await sessionIo.listBackups(dir, relativePath)
        for (const item of list) {
          merged.push({ ...item, relativePath })
        }
      } catch {
        /* keep other files' backups */
      }
    }
    merged.sort((a, b) => b.mtimeMs - a.mtimeMs)
    backups.value = merged
  }

  async function openGame(mod: GameModule, dir: string): Promise<void> {
    game.value = markRaw(mod)
    saveDir.value = dir
    clearDraft()
    await refreshSlots()
  }

  async function loadSlot(slotId: string): Promise<void> {
    const mod = game.value
    const dir = saveDir.value
    const slot = slots.value.find((s) => s.id === slotId)
    if (!mod || !dir || !slot) {
      loadError.value = slotId
      return
    }
    const files: SlotBytes[] = []
    for (const relativePath of slot.sessionFiles) {
      try {
        const bytes = await sessionIo.readFileBytes(dir, relativePath)
        if (!bytes || bytes.length === 0) continue
        files.push({ relativePath, bytes })
      } catch {
        /* optional / unreadable session file — skip */
      }
    }
    if (files.length === 0) {
      loadError.value = slot.sessionFiles[0] ?? slotId
      return
    }
    try {
      const parsed = wrapState(mod.parse(files))
      currentSlotId.value = slotId
      state.value = parsed
      original.value = files
      dirty.value = false
      loadError.value = null
      revision.value = 0
      triggerRef(state)
      await refreshBackups(slot.sessionFiles)
    } catch (e) {
      loadError.value = translateError(e)
    }
  }

  function runAction(id: string, payload?: unknown): void {
    const mod = game.value
    if (!mod || state.value == null) return
    state.value = wrapState(mod.applyAction(state.value, id, payload))
    dirty.value = true
    revision.value++
    triggerRef(state)
  }

  function mutate(mutator: (s: unknown) => unknown): void {
    if (state.value == null) return
    state.value = wrapState(mutator(state.value))
    dirty.value = true
    revision.value++
    triggerRef(state)
  }

  async function save(): Promise<ValidationIssue[]> {
    const mod = game.value
    if (!mod || state.value == null) return []
    const issues = mod.validate(state.value)
    if (issues.length) return issues
    const next = mod.serialize(state.value)
    assertSerializeSane(next)
    const changed = changedFiles(original.value, next)
    for (const file of changed) {
      await sessionIo.writeAtomic(saveDir.value, file.relativePath, file.bytes)
    }
    original.value = next.map((file) => ({
      relativePath: file.relativePath,
      bytes: file.bytes
    }))
    dirty.value = false
    const sessionFiles =
      slots.value.find((s) => s.id === currentSlotId.value)?.sessionFiles ??
      next.map((f) => f.relativePath)
    await refreshBackups(sessionFiles)
    await refreshSlots()
    return []
  }

  async function restore(relativePath: string, backupName: string): Promise<void> {
    const slotId = currentSlotId.value
    await sessionIo.restoreBackup(saveDir.value, relativePath, backupName)
    if (slotId) await loadSlot(slotId)
  }

  async function removeBackup(relativePath: string, backupName: string): Promise<void> {
    await sessionIo.deleteBackup(saveDir.value, backupName)
    const sessionFiles =
      slots.value.find((s) => s.id === currentSlotId.value)?.sessionFiles ??
      original.value.map((f) => f.relativePath)
    await refreshBackups(sessionFiles.length ? sessionFiles : [relativePath])
  }

  function goLibrary(): void {
    game.value = null
    saveDir.value = ''
    slots.value = []
    clearDraft()
  }

  return {
    game,
    saveDir,
    slots,
    currentSlotId,
    state,
    original,
    dirty,
    backups,
    loadError,
    revision,
    openGame,
    loadSlot,
    runAction,
    mutate,
    save,
    restore,
    removeBackup,
    goLibrary
  }
})
