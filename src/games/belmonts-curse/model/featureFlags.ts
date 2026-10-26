import { arcanaReady } from '../catalog/arcana'
import { catalogReady } from '../catalog/ready'

export const featureFlags = {
  /** Inventory add/remove/equip unlocked when catalog gate passes. */
  addItem: catalogReady(),
  /** Arcana unlock when arcana.json is dense enough. */
  addAbility: arcanaReady()
} as const
