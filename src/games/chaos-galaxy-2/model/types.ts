import type { Es3BinaryEntry } from './es3-binary'
import type { SaveData } from './saveModel'

export interface ChaosGalaxy2State {
  slot: number
  /** Campaign projection — entries remain the serialize source of truth */
  campaign: SaveData
  /** Ordered config entries until Task 4 ConfigSnapshot */
  configEntries: Es3BinaryEntry[] | null
}
