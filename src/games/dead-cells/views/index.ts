import BlueprintsTab from './BlueprintsTab.vue'
import ResourcesTab from './ResourcesTab.vue'
import RunesTab from './RunesTab.vue'
import SkinsTab from './SkinsTab.vue'

export const deadCellsViews = [
  { id: 'resources', labelKey: 'dc.tabs.resources', component: ResourcesTab },
  { id: 'blueprints', labelKey: 'dc.tabs.blueprints', component: BlueprintsTab },
  { id: 'skins', labelKey: 'dc.tabs.skins', component: SkinsTab },
  { id: 'runes', labelKey: 'dc.tabs.runes', component: RunesTab }
]
