import BlueprintsTab from './BlueprintsTab.vue'
import ResourcesTab from './ResourcesTab.vue'
import RunesTab from './RunesTab.vue'
import UnlockTab from './UnlockTab.vue'

export const deadCellsViews = [
  { id: 'resources', labelKey: 'dc.tabs.resources', component: ResourcesTab },
  { id: 'blueprints', labelKey: 'dc.tabs.blueprints', component: BlueprintsTab },
  { id: 'unlock', labelKey: 'dc.tabs.unlock', component: UnlockTab },
  { id: 'runes', labelKey: 'dc.tabs.runes', component: RunesTab }
]
