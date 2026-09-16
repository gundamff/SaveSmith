import type { Es3BinaryEntry } from './es3-binary'

export interface ChaosGalaxy2State {
  slot: number
  /** Ordered campaign entries — source of truth for serialize */
  campaignEntries: Es3BinaryEntry[]
  configEntries: Es3BinaryEntry[] | null
}
