import ResourcesTab from './ResourcesTab.vue'
import RecordsTab from './RecordsTab.vue'
import ProgressTab from './ProgressTab.vue'
import CodexTab from './CodexTab.vue'

export const pbzViews = [
  { id: 'resources', labelKey: 'pbz.tabs.resources', component: ResourcesTab },
  { id: 'records', labelKey: 'pbz.tabs.records', component: RecordsTab },
  { id: 'progress', labelKey: 'pbz.tabs.progress', component: ProgressTab },
  { id: 'codex', labelKey: 'pbz.tabs.codex', component: CodexTab }
]
