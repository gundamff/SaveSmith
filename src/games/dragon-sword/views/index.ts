import type { ViewSpec } from '@sdk/types'
import CurrencyTab from './CurrencyTab.vue'
import ItemsTab from './ItemsTab.vue'

export const dragonSwordViews: ViewSpec[] = [
  { id: 'currency', labelKey: 'ds.tabs.currency', component: CurrencyTab },
  { id: 'items', labelKey: 'ds.tabs.items', component: ItemsTab }
]
