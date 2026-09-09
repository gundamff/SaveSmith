/// <reference types="node" />
import { ModuleError } from '@sdk/error'
import type { SaveLocator, SerializedFile, SlotBytes } from '@sdk/types'

export function expandWindowsTemplate(
  template: string,
  env: NodeJS.Dict<string | undefined>
): string {
  return template.replace(/%([^%]+)%/g, (_, name: string) => env[name] ?? '')
}

export function identifySaveDir(locator: SaveLocator, fileNames: string[]): boolean {
  const present = new Set(fileNames.map((n) => n.toLowerCase()))
  return locator.identifyAnyOf.some((name) => present.has(name.toLowerCase()))
}

export function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export function utf8Decode(b: Uint8Array): string {
  return new TextDecoder().decode(b)
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function changedFiles(original: SlotBytes[], next: SerializedFile[]): SerializedFile[] {
  const prev = new Map(original.map((f) => [f.relativePath, f.bytes]))
  return next.filter((f) => {
    const old = prev.get(f.relativePath)
    return old === undefined || !bytesEqual(old, f.bytes)
  })
}

export function assertSerializeSane(files: SerializedFile[]): void {
  if (files.length === 0 || files.some((f) => f.bytes.length === 0)) {
    throw new ModuleError('EMPTY_SERIALIZE', [])
  }
}
