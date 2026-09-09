import type { ViewSpec } from '@sdk/types'
import ResourcesTab from './ResourcesTab.vue'
import UnlockTab from './UnlockTab.vue'

export const wanderburgViews: ViewSpec[] = [
  { id: 'resources', labelKey: 'wb.tabs.resources', component: ResourcesTab },
  { id: 'unlock', labelKey: 'wb.tabs.unlock', component: UnlockTab }
]
