import type { ViewSpec } from '@sdk/types'
import ResourcesTab from './ResourcesTab.vue'
import PlanetsTab from './PlanetsTab.vue'
import CommandersTab from './CommandersTab.vue'
import FleetsTab from './FleetsTab.vue'
import UnlockTab from './UnlockTab.vue'
import CollectionTab from './CollectionTab.vue'

export const chaosGalaxy2Views: ViewSpec[] = [
  { id: 'resources', labelKey: 'cg2.tabs.resources', component: ResourcesTab },
  { id: 'planets', labelKey: 'cg2.tabs.planets', component: PlanetsTab },
  { id: 'commanders', labelKey: 'cg2.tabs.commanders', component: CommandersTab },
  { id: 'fleets', labelKey: 'cg2.tabs.fleets', component: FleetsTab },
  { id: 'unlock', labelKey: 'cg2.tabs.unlock', component: UnlockTab },
  { id: 'collection', labelKey: 'cg2.tabs.collection', component: CollectionTab }
]
