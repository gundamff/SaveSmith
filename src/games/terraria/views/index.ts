import type { Component } from 'vue'
import CharacterTab from './CharacterTab.vue'
import InventoryTab from './InventoryTab.vue'

export const terrariaViews: { id: string; labelKey: string; component: Component }[] = [
  { id: 'character', labelKey: 'te.tabs.character', component: CharacterTab },
  { id: 'inventory', labelKey: 'te.tabs.inventory', component: InventoryTab }
]
