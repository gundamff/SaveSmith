export type PlayerScalarKey =
  | 'level'
  | 'experienceCurrent'
  | 'healthUpgradeFragmentCount'
  | 'manaUpgradeFragmentCount'
  | 'atkBonusUpgradeCount'
  | 'defBonusUpgradeCount'
  | 'currentHealth'
  | 'currentMana'
  | 'currentHealChargesCount'
  | 'currentTheHermitDeathDefianceCount'

export interface PlayerView {
  id: string
  saveDate: string
  playTimeInSeconds: number
  version: string
  level: number
  experienceCurrent: number
  healthUpgradeFragmentCount: number
  manaUpgradeFragmentCount: number
  atkBonusUpgradeCount: number
  defBonusUpgradeCount: number
  currentHealth: number
  currentMana: number
  currentHealChargesCount: number
  currentTheHermitDeathDefianceCount: number
  itemsInInventory: string[]
  equippedWeaponItem: string
  equippedSpellItem: string
  equippedSkin: string
  equippedCharmItems: string[]
  vaniaMoves: string[]
  progressionPersistentSave: string[]
  arcanaCompletedTasks: string[]
  arcanaUnlockedTalents: string[]
}

export interface ExplorationView {
  worldKeyCount: number
  completionItemCount: number
  entityCount: number
}

export interface BelmontsCurseState {
  relativePath: string
  /** Full root object; sole source of truth for serialize */
  raw: Record<string, unknown>
  player: PlayerView
  exploration: ExplorationView
}
