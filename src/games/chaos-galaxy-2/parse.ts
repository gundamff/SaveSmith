import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { parseEs3Binary, serializeEs3Binary } from './model/es3-binary'
import { SaveData } from './model/saveModel'
import type { ChaosGalaxy2State } from './model/types'
import { slotFileName } from './slots'

export type { ChaosGalaxy2State } from './model/types'
export { SaveData } from './model/saveModel'

const SLOT_FILE = /^savedata(\d+)\.cg2$/i

export function parse(files: SlotBytes[]): ChaosGalaxy2State {
  const campaignFile = files.find((f) => SLOT_FILE.test(basename(f.relativePath)))
  if (!campaignFile) throw new ModuleError('MISSING_FIELD', ['savedata'])
  const match = basename(campaignFile.relativePath).match(SLOT_FILE)
  const slot = match ? Number(match[1]) : 0
  const campaign = SaveData.load(campaignFile.bytes)

  const configFile = files.find((f) => basename(f.relativePath).toLowerCase() === 'config.cg2')
  let configEntries: ChaosGalaxy2State['configEntries'] = null
  if (configFile) {
    try {
      configEntries = parseEs3Binary(configFile.bytes)
    } catch {
      configEntries = null
    }
  }

  return { slot, campaign, configEntries }
}

export function serialize(state: ChaosGalaxy2State): SerializedFile[] {
  const out: SerializedFile[] = [
    {
      relativePath: slotFileName(state.slot),
      bytes: state.campaign.serialize()
    }
  ]
  if (state.configEntries !== null) {
    out.push({
      relativePath: 'config.cg2',
      bytes: serializeEs3Binary(state.configEntries)
    })
  }
  return out
}

export function validate(_state: ChaosGalaxy2State): ValidationIssue[] {
  return []
}

function basename(relativePath: string): string {
  const parts = relativePath.split(/[/\\]/)
  return parts[parts.length - 1] ?? relativePath
}
