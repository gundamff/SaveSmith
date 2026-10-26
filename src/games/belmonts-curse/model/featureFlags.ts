import { catalogReady } from '../catalog/ready'

export const featureFlags = {
  /** Inventory add/remove/equip unlocked when catalog gate passes. */
  addItem: catalogReady(),
  addAbility: false
} as const
