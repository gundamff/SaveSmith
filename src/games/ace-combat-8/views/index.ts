import type { ViewSpec } from '@sdk/types'
import AircraftTab from './AircraftTab.vue'
import EmblemsTab from './EmblemsTab.vue'
import MissionsTab from './MissionsTab.vue'
import ProgressTab from './ProgressTab.vue'
import ResourcesTab from './ResourcesTab.vue'
import SkinsTab from './SkinsTab.vue'

export const aceCombat8Views: ViewSpec[] = [
  { id: 'resources', labelKey: 'ac8.tabs.resources', component: ResourcesTab },
  { id: 'progress', labelKey: 'ac8.tabs.progress', component: ProgressTab },
  { id: 'aircraft', labelKey: 'ac8.tabs.aircraft', component: AircraftTab },
  { id: 'skins', labelKey: 'ac8.tabs.skins', component: SkinsTab },
  { id: 'emblems', labelKey: 'ac8.tabs.emblems', component: EmblemsTab },
  { id: 'missions', labelKey: 'ac8.tabs.missions', component: MissionsTab }
]
