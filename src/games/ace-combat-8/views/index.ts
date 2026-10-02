import type { ViewSpec } from '@sdk/types'
import ProgressTab from './ProgressTab.vue'
import ResourcesTab from './ResourcesTab.vue'

export const aceCombat8Views: ViewSpec[] = [
  { id: 'resources', labelKey: 'ac8.tabs.resources', component: ResourcesTab },
  { id: 'progress', labelKey: 'ac8.tabs.progress', component: ProgressTab }
]
