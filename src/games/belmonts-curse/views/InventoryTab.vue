<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '@host/i18n'
import { lookupItemName } from '../catalog/names'
import { useBcEditor } from './inject'

interface ItemRow {
  index: number
  id: string
  name: string
}

interface EquipRow {
  slot: string
  id: string
  name: string
}

const editor = useBcEditor()

const inventoryRows = computed((): ItemRow[] => {
  void editor.rev
  const loc = locale.value === 'en' ? 'en' : 'zh'
  return editor.save.player.itemsInInventory.map((id, index) => ({
    index,
    id,
    name: lookupItemName(id, loc)
  }))
})

const equipRows = computed((): EquipRow[] => {
  void editor.rev
  const loc = locale.value === 'en' ? 'en' : 'zh'
  const p = editor.save.player
  const rows: EquipRow[] = [
    { slot: t('bc.inventory.weapon'), id: p.equippedWeaponItem, name: lookupItemName(p.equippedWeaponItem, loc) },
    { slot: t('bc.inventory.spell'), id: p.equippedSpellItem, name: lookupItemName(p.equippedSpellItem, loc) },
    { slot: t('bc.inventory.skin'), id: p.equippedSkin, name: lookupItemName(p.equippedSkin, loc) }
  ]
  p.equippedCharmItems.forEach((id, i) => {
    rows.push({
      slot: t('bc.inventory.charmSlot', i + 1),
      id,
      name: id ? lookupItemName(id, loc) : t('bc.inventory.empty')
    })
  })
  return rows
})
</script>

<template>
  <div class="bc-inventory" :data-ss-rev="editor.rev">
    <h3 class="section">{{ t('bc.inventory.items') }}</h3>
    <p v-if="inventoryRows.length === 0" class="empty">{{ t('bc.inventory.emptyList') }}</p>
    <el-table v-else :data="inventoryRows" size="small" row-key="index" style="width: 100%">
      <el-table-column :label="t('bc.inventory.colId')" prop="id" min-width="200" />
      <el-table-column :label="t('bc.inventory.colName')" prop="name" min-width="200" />
    </el-table>
    <h3 class="section">{{ t('bc.inventory.equipment') }}</h3>
    <el-table :data="equipRows" size="small" row-key="slot" style="width: 100%">
      <el-table-column :label="t('bc.inventory.colSlot')" prop="slot" width="140" />
      <el-table-column :label="t('bc.inventory.colId')" prop="id" min-width="180" />
      <el-table-column :label="t('bc.inventory.colName')" prop="name" min-width="180" />
    </el-table>
    <p class="hint">{{ t('bc.inventory.readonlyHint') }}</p>
  </div>
</template>

<style scoped>
.section {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.section:first-child {
  margin-top: 0;
}
.empty,
.hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
.hint {
  margin-top: 12px;
}
</style>
