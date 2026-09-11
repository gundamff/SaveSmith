import type { ViewSpec } from '@sdk/types'
import CurrencyTab from './CurrencyTab.vue'

export const dragonSwordViews: ViewSpec[] = [
  { id: 'currency', labelKey: 'ds.tabs.currency', component: CurrencyTab }
]
