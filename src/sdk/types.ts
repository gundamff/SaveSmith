import type { Component } from 'vue'

export type LocaleText = { zh: string; en: string }

export interface GameCatalog {
  name: LocaleText
  cover: string
  rightsHolder: string
  summary?: LocaleText
  developer?: string
  publisher?: string
  steamAppId?: number
  storeUrl?: string
  website?: string
}

export interface SaveLocator {
  windowsPathTemplates: string[]
  identifyAnyOf: string[]
  /** If set, a directory matches when any listed name matches this regex (OR with identifyAnyOf). */
  identifyNameRegex?: string
  slotFilePatterns?: string[]
}

export interface ListedFile {
  relativePath: string
  bytes: Uint8Array | null
}

export interface ListedFiles {
  dir: string
  files: ListedFile[]
}

export interface SlotInfo {
  id: string
  exists: boolean
  readable: boolean
  title?: string
  subtitle?: string
  sessionFiles: string[]
}

export interface SlotBytes {
  relativePath: string
  bytes: Uint8Array
}

export type ActionKind = 'button' | 'toggle' | 'number' | 'slider' | 'select'

export interface ActionSpec {
  id: string
  labelKey: string
  kind: ActionKind
  disabled?: boolean
  value?: number | boolean | string
  min?: number
  max?: number
  step?: number
  options?: { value: string; labelKey: string }[]
}

export interface ValidationIssue {
  code: string
  args: Array<string | number>
}

export interface SerializedFile {
  relativePath: string
  bytes: Uint8Array
}

export interface ViewSpec {
  id: string
  labelKey: string
  component: Component
}

export interface GameModule<S = unknown> {
  id: string
  catalog: GameCatalog
  locate: SaveLocator
  listSlots(files: ListedFiles): SlotInfo[]
  parse(files: SlotBytes[]): S | Promise<S>
  serialize(state: S): SerializedFile[] | Promise<SerializedFile[]>
  validate(state: S): ValidationIssue[]
  actions(state: S): ActionSpec[]
  applyAction(state: S, id: string, payload?: unknown): S
  views: ViewSpec[]
}

export const BACKUP_KEEP = 10
