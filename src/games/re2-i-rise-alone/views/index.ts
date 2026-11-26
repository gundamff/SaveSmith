import type { ViewSpec } from '@sdk/types'
import ResourcesTab from './ResourcesTab.vue'

export const re2IraViews: ViewSpec[] = [
  { id: 'resources', labelKey: 'r2ira.tabs.resources', component: ResourcesTab }
]