import { expandWindowsTemplate, identifySaveDir } from '@sdk/session'
import type { SaveLocator } from '@sdk/types'

export async function probeModuleSaveDir(
  locator: SaveLocator,
  env: Record<string, string | undefined>,
  listDirNames: (dir: string) => Promise<string[]>
): Promise<string | null> {
  for (const template of locator.windowsPathTemplates) {
    const dir = expandWindowsTemplate(template, env)
    if (!dir) continue
    try {
      const names = await listDirNames(dir)
      if (identifySaveDir(locator, names)) return dir
    } catch {
      /* missing path or IO error: try next template */
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
