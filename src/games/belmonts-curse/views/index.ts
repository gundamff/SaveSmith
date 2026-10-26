import type { ViewSpec } from '@sdk/types'
import AbilitiesTab from './AbilitiesTab.vue'
import CharacterTab from './CharacterTab.vue'
import ExplorationTab from './ExplorationTab.vue'
import InventoryTab from './InventoryTab.vue'
import OverviewTab from './OverviewTab.vue'

export const belmontsCurseViews: ViewSpec[] = [
  { id: 'overview', labelKey: 'bc.tabs.overview', component: OverviewTab },
  { id: 'character', labelKey: 'bc.tabs.character', component: CharacterTab },
  { id: 'inventory', labelKey: 'bc.tabs.inventory', component: InventoryTab },
  { id: 'abilities', labelKey: 'bc.tabs.abilities', component: AbilitiesTab },
  { id: 'exploration', labelKey: 'bc.tabs.exploration', component: ExplorationTab }
]
