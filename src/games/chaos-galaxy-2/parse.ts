import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { applyCampaignCaps } from './model/caps'
import { ConfigSnapshot } from './model/configModel'
import { gameData } from './model/gameData'
import { SaveData } from './model/saveModel'
import type { ChaosGalaxy2State } from './model/types'
import { slotFileName } from './slots'

export type { ChaosGalaxy2State } from './model/types'
export { SaveData } from './model/saveModel'
export { ConfigSnapshot } from './model/configModel'

const SLOT_FILE = /^savedata(\d+)\.cg2$/i

export function parse(files: SlotBytes[]): ChaosGalaxy2State {
  const campaignFile = files.find((f) => SLOT_FILE.test(basename(f.relativePath)))
  if (!campaignFile) throw new ModuleError('MISSING_FIELD', ['savedata'])
  const match = basename(campaignFile.relativePath).match(SLOT_FILE)
  const slot = match ? Number(match[1]) : 0
  const campaign = SaveData.load(campaignFile.bytes)

  const configFile = files.find((f) => basename(f.relativePath).toLowerCase() === 'config.cg2')
  let config: ChaosGalaxy2State['config'] = null
  if (configFile) {
    try {
      config = ConfigSnapshot.load(configFile.bytes)
    } catch {
      config = null
    }
  }

  return { slot, campaign, config }
}

export function serialize(state: ChaosGalaxy2State): SerializedFile[] {
  const out: SerializedFile[] = [
    {
      relativePath: slotFileName(state.slot),
      bytes: state.campaign.serialize()
    }
  ]
  if (state.config !== null) {
    out.push({
      relativePath: 'config.cg2',
      bytes: state.config.serialize()
    })
  }
  return out
}

export function validate(state: ChaosGalaxy2State): ValidationIssue[] {
  applyCampaignCaps(state.campaign, gameData)
  return []
}

function basename(relativePath: string): string {
  const parts = relativePath.split(/[/\\]/)
  return parts[parts.length - 1] ?? relativePath
}
