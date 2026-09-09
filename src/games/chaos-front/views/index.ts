import type { ViewSpec } from '@sdk/types'
import ResourcesTab from './ResourcesTab.vue'
import PlanetsTab from './PlanetsTab.vue'
import FormationTab from './FormationTab.vue'
import UnitsTab from './UnitsTab.vue'
import PilotsTab from './PilotsTab.vue'
import UnlockTab from './UnlockTab.vue'
import CollectionTab from './CollectionTab.vue'

export const chaosFrontViews: ViewSpec[] = [
  { id: 'resources', labelKey: 'cf.tabs.resources', component: ResourcesTab },
  { id: 'planets', labelKey: 'cf.tabs.planets', component: PlanetsTab },
  { id: 'formation', labelKey: 'cf.tabs.formation', component: FormationTab },
  { id: 'units', labelKey: 'cf.tabs.units', component: UnitsTab },
  { id: 'pilots', labelKey: 'cf.tabs.pilots', component: PilotsTab },
  { id: 'unlock', labelKey: 'cf.tabs.unlock', component: UnlockTab },
  { id: 'collection', labelKey: 'cf.tabs.collection', component: CollectionTab }
]
