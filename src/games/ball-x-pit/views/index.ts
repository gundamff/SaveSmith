import type { ViewSpec } from '@sdk/types'
import ResourcesTab from './ResourcesTab.vue'
import WikiTab from './WikiTab.vue'

export const ballXPitViews: ViewSpec[] = [
  { id: 'resources', labelKey: 'bxp.tabs.resources', component: ResourcesTab },
  { id: 'wiki', labelKey: 'bxp.tabs.wiki', component: WikiTab }
]
