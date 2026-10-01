import BlueprintsTab from './BlueprintsTab.vue'
import ResourcesTab from './ResourcesTab.vue'
import StatsTab from './StatsTab.vue'

export const deadCellsViews = [
  { id: 'resources', labelKey: 'dc.tabs.resources', component: ResourcesTab },
  { id: 'blueprints', labelKey: 'dc.tabs.blueprints', component: BlueprintsTab },
  { id: 'stats', labelKey: 'dc.tabs.stats', component: StatsTab }
]
