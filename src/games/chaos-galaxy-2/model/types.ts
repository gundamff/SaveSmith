import type { ConfigSnapshot } from './configModel'
import type { SaveData } from './saveModel'

export interface ChaosGalaxy2State {
  slot: number
  /** Campaign projection — entries remain the serialize source of truth */
  campaign: SaveData
  /** config.cg2 collection bitmasks; null when file missing or parse failed */
  config: ConfigSnapshot | null
}
