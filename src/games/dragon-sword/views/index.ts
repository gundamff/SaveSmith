import type { ViewSpec } from '@sdk/types'
import CharactersTab from './CharactersTab.vue'
import CurrencyTab from './CurrencyTab.vue'
import EquipmentTab from './EquipmentTab.vue'
import ItemsTab from './ItemsTab.vue'
import TeamTab from './TeamTab.vue'

export const dragonSwordViews: ViewSpec[] = [
  { id: 'currency', labelKey: 'ds.tabs.currency', component: CurrencyTab },
  { id: 'items', labelKey: 'ds.tabs.items', component: ItemsTab },
  { id: 'characters', labelKey: 'ds.tabs.characters', component: CharactersTab },
  { id: 'team', labelKey: 'ds.tabs.team', component: TeamTab },
  { id: 'equipment', labelKey: 'ds.tabs.equipment', component: EquipmentTab }
]
