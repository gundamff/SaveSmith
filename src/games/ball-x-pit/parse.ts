import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { validateEnvelope } from './model/binary'
import { readResources, writeResources, type TownResources } from './model/resources'
import { projectWiki, unlockAllWiki, type WikiProgress } from './model/wiki'
import { META, basename } from './slots'

export interface BallXPitState {
  slot: number
  mainPath: string
  backupPath: string | null
  main: Uint8Array
  backup: Uint8Array | null
  originalMain: Uint8Array
  originalBackup: Uint8Array | null
  resources: TownResources
  wiki: WikiProgress
  dirtyResources: boolean
  dirtyWiki: boolean
}

function refreshProjections(state: BallXPitState): void {
  state.resources = readResources(state.main)
  state.wiki = projectWiki(state.main)
}

export function parse(files: SlotBytes[]): BallXPitState {
  const mainFile = files.find((f) => META.test(basename(f.relativePath)))
  if (!mainFile) throw new ModuleError('MISSING_FIELD', ['metaN.yankai'])
  const m = basename(mainFile.relativePath).match(META)
  const slot = m ? Number(m[1]) : 1

  validateEnvelope(mainFile.bytes)
  const main = new Uint8Array(mainFile.bytes)
  const originalMain = new Uint8Array(mainFile.bytes)

  const backupName = `meta${slot}_backup.yankai`
  const backupFile = files.find((f) => basename(f.relativePath).toLowerCase() === backupName.toLowerCase())
  let backup: Uint8Array | null = null
  let originalBackup: Uint8Array | null = null
  let backupPath: string | null = null
  if (backupFile) {
    validateEnvelope(backupFile.bytes)
    backup = new Uint8Array(backupFile.bytes)
    originalBackup = new Uint8Array(backupFile.bytes)
    backupPath = backupFile.relativePath
  }

  const state: BallXPitState = {
    slot,
    mainPath: mainFile.relativePath,
    backupPath,
    main,
    backup,
    originalMain,
    originalBackup,
    resources: { money: 0, rice: 0, wood: 0, stone: 0 },
    wiki: {
      heroTotal: 0,
      heroDiscovered: 0,
      passiveTotal: 0,
      passiveDiscovered: 0,
      comboCells: 0,
      comboDiscovered: 0
    },
    dirtyResources: false,
    dirtyWiki: false
  }
  refreshProjections(state)
  return state
}

export function setResources(state: BallXPitState, next: TownResources): void {
  writeResources(state.main, next)
  if (state.backup) writeResources(state.backup, next)
  state.dirtyResources = true
  refreshProjections(state)
}

export function unlockWiki(state: BallXPitState): number {
  const n = unlockAllWiki(state.main)
  if (state.backup) unlockAllWiki(state.backup)
  state.dirtyWiki = true
  refreshProjections(state)
  return n
}

export function serialize(state: BallXPitState): SerializedFile[] {
  const out: SerializedFile[] = []
  const mainDirty = state.dirtyResources || state.dirtyWiki
  out.push({
    relativePath: state.mainPath,
    bytes: mainDirty ? state.main : state.originalMain
  })
  if (state.backupPath && state.backup && state.originalBackup) {
    out.push({
      relativePath: state.backupPath,
      bytes: mainDirty ? state.backup : state.originalBackup
    })
  }
  return out
}

export function validate(state: BallXPitState): ValidationIssue[] {
  try {
    validateEnvelope(state.main)
    readResources(state.main)
    projectWiki(state.main)
    if (state.backup) {
      validateEnvelope(state.backup)
      readResources(state.backup)
      projectWiki(state.backup)
    }
  } catch (e) {
    if (e instanceof ModuleError) return [{ code: e.code, args: e.args }]
    throw e
  }
  return []
}
