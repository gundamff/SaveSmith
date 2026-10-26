import type { ViewSpec } from '@sdk/types'
import CharacterTab from './CharacterTab.vue'
import InventoryTab from './InventoryTab.vue'
import OverviewTab from './OverviewTab.vue'
import TarotTab from './TarotTab.vue'

export const belmontsCurseViews: ViewSpec[] = [
  { id: 'overview', labelKey: 'bc.tabs.overview', component: OverviewTab },
  { id: 'character', labelKey: 'bc.tabs.character', component: CharacterTab },
  { id: 'inventory', labelKey: 'bc.tabs.inventory', component: InventoryTab },
  { id: 'tarot', labelKey: 'bc.tabs.tarot', component: TarotTab }
]
