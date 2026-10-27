import type { ViewSpec } from '@sdk/types'
import ArtifactsTab from './ArtifactsTab.vue'
import BestiaryTab from './BestiaryTab.vue'
import ItemsTab from './ItemsTab.vue'
import JournalTab from './JournalTab.vue'
import MapsTab from './MapsTab.vue'
import RecordsTab from './RecordsTab.vue'
import StatusTab from './StatusTab.vue'
import VisionsTab from './VisionsTab.vue'

export const finalFantasyResonanceViews: ViewSpec[] = [
  { id: 'records', labelKey: 'ffr.tabs.records', component: RecordsTab },
  { id: 'status', labelKey: 'ffr.tabs.status', component: StatusTab },
  { id: 'items', labelKey: 'ffr.tabs.items', component: ItemsTab },
  { id: 'visions', labelKey: 'ffr.tabs.visions', component: VisionsTab },
  { id: 'maps', labelKey: 'ffr.tabs.maps', component: MapsTab },
  { id: 'bestiary', labelKey: 'ffr.tabs.bestiary', component: BestiaryTab },
  { id: 'journal', labelKey: 'ffr.tabs.journal', component: JournalTab },
  { id: 'artifacts', labelKey: 'ffr.tabs.artifacts', component: ArtifactsTab }
]
