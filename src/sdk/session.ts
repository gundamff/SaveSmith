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
  if (locator.identifyAnyOf.some((name) => present.has(name.toLowerCase()))) {
    return true
  }
  const pattern = locator.identifyNameRegex
  if (!pattern) return false
  const re = new RegExp(pattern)
  return fileNames.some((name) => re.test(name))
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

function segmentMatches(pattern: string, segment: string): boolean {
  if (pattern === '*') return true
  const star = pattern.indexOf('*')
  if (star === -1) return pattern.toLowerCase() === segment.toLowerCase()
  const prefix = pattern.slice(0, star).toLowerCase()
  const suffix = pattern.slice(star + 1).toLowerCase()
  const seg = segment.toLowerCase()
  return seg.startsWith(prefix) && seg.endsWith(suffix) && seg.length >= prefix.length + suffix.length
}

export function matchSlotFilePatterns(paths: string[], patterns: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const pattern of patterns) {
    const parts = pattern.replace(/\\/g, '/').split('/')
    for (const raw of paths) {
      const path = raw.replace(/\\/g, '/')
      const segs = path.split('/')
      if (segs.length !== parts.length) continue
      let ok = true
      for (let i = 0; i < parts.length; i++) {
        if (!segmentMatches(parts[i]!, segs[i]!)) {
          ok = false
          break
        }
      }
      if (!ok) continue
      const key = path.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(path)
    }
  }
  return out
}
