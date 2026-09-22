import OverviewTab from './OverviewTab.vue'
import FightersTab from './FightersTab.vue'
import ItemsTab from './ItemsTab.vue'

export const eslabongViews = [
  { id: 'overview', labelKey: 'es.tabs.overview', component: OverviewTab },
  { id: 'fighters', labelKey: 'es.tabs.fighters', component: FightersTab },
  { id: 'items', labelKey: 'es.tabs.items', component: ItemsTab }
]
