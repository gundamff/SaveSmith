import { expandWindowsTemplate, identifySaveDir } from '@sdk/session'
import type { SaveLocator } from '@sdk/types'

const MAX_WILDCARD_RESULTS = 64

/**
 * Expand `*` path segments (one directory level each) by listing the parent.
 * Lets a locator cover per-user folders such as Steam's `userdata\<id>\...`.
 */
async function expandWildcards(
  path: string,
  listDirNames: (dir: string) => Promise<string[]>
): Promise<string[]> {
  const parts = path.split(/[\\/]+/).filter((p) => p.length > 0)
  if (parts.length === 0) return []
  const out: string[] = []
  const walk = async (current: string, remaining: string[]): Promise<void> => {
    if (out.length >= MAX_WILDCARD_RESULTS) return
    if (remaining.length === 0) {
      out.push(current)
      return
    }
    const [head, ...tail] = remaining
    if (head === '*') {
      let names: string[] = []
      try {
        names = await listDirNames(current)
      } catch {
        return
      }
      for (const name of names) await walk(`${current}\\${name}`, tail)
      return
    }
    await walk(`${current}\\${head}`, tail)
  }
  await walk(parts[0]!, parts.slice(1))
  return out
}

/** Templates whose `%VAR%` placeholders are not provided cannot be expanded. */
function hasUnexpandedVar(template: string, env: Record<string, string | undefined>): boolean {
  return [...template.matchAll(/%([^%]+)%/g)].some((m) => !env[m[1]!])
}

export async function probeModuleSaveDir(
  locator: SaveLocator,
  env: Record<string, string | undefined>,
  listDirNames: (dir: string) => Promise<string[]>
): Promise<string | null> {
  for (const template of locator.windowsPathTemplates) {
    if (hasUnexpandedVar(template, env)) continue
    const dir = expandWindowsTemplate(template, env)
    if (!dir) continue
    const candidates = dir.includes('*') ? await expandWildcards(dir, listDirNames) : [dir]
    for (const candidate of candidates) {
      try {
        const names = await listDirNames(candidate)
        if (identifySaveDir(locator, names)) return candidate
      } catch {
        /* missing path or IO error: try next candidate */
      }
    }
  }
  return null
}

export async function confirmSaveDir(
  locator: SaveLocator,
  dir: string,
  listDirNames: (dir: string) => Promise<string[]>
): Promise<boolean> {
  try {
    const names = await listDirNames(dir)
    return identifySaveDir(locator, names)
  } catch {
    return false
  }
}
