import type { ViewSpec } from '@sdk/types'
import CharactersTab from './CharactersTab.vue'
import CookingTab from './CookingTab.vue'
import CurrencyTab from './CurrencyTab.vue'
import EquipmentTab from './EquipmentTab.vue'
import ItemsTab from './ItemsTab.vue'
import TeamTab from './TeamTab.vue'
import UnlockTab from './UnlockTab.vue'

export const dragonSwordViews: ViewSpec[] = [
  { id: 'currency', labelKey: 'ds.tabs.currency', component: CurrencyTab },
  { id: 'items', labelKey: 'ds.tabs.items', component: ItemsTab },
  { id: 'cooking', labelKey: 'ds.tabs.cooking', component: CookingTab },
  { id: 'characters', labelKey: 'ds.tabs.characters', component: CharactersTab },
  { id: 'team', labelKey: 'ds.tabs.team', component: TeamTab },
  { id: 'equipment', labelKey: 'ds.tabs.equipment', component: EquipmentTab },
  { id: 'unlock', labelKey: 'ds.tabs.unlock', component: UnlockTab }
]
