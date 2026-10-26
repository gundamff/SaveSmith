import { arcanaReady } from '../catalog/arcana'
import { mercyReady } from '../catalog/mercy'
import { catalogReady } from '../catalog/ready'

export const featureFlags = {
  /** Inventory add/remove/equip unlocked when catalog gate passes. */
  addItem: catalogReady(),
  /** Tarot tab: Arcana unlock + Works of Mercy when both catalogs ready. */
  addTarot: arcanaReady() && mercyReady()
} as const
