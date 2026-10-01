<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '@host/i18n'
import { itemDisplayName } from '../model/itemNames'
import {
  projectUser,
  setItemInvestedCells,
  setItemIsNew,
  setItemUnlocked,
  type ItemRow
} from '../model/userModel'
import { useDcEditor } from './inject'

type ItemRowView = ItemRow & { name: string; rawId: string }

const editor = useDcEditor()
const rows = computed((): ItemRowView[] => {
  void editor.rev
  return projectUser(editor.save.doc).items.map((i) => ({
    ...i,
    name: itemDisplayName(i.itemId, locale.value),
    rawId: i.itemId
  }))
})
const editable = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc).editable
})

function toggleUnlocked(index: number, v: boolean | string | number): void {
  editor.markDirty(() => setItemUnlocked(editor.save.doc, index, v === true))
}

function changeCells(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setItemInvestedCells(editor.save.doc, index, v))
}

function toggleNew(index: number, v: boolean | string | number): void {
  editor.markDirty(() => setItemIsNew(editor.save.doc, index, v === true))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p v-if="!editable" class="dc-empty">{{ t('dc.blueprints.unreadable') }}</p>
    <el-table v-else :data="rows" size="small" style="width: 100%" row-key="index">
      <el-table-column :label="t('dc.blueprints.name')" min-width="220">
        <template #default="{ row }">
          <div class="name-cell">
            <span>{{ row.name }}</span>
            <span v-if="row.name !== row.rawId" class="raw-id">{{ row.rawId }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('dc.blueprints.unlocked')" width="110">
        <template #default="{ row }">
          <el-switch
            :model-value="row.unlocked"
            @update:model-value="(v: boolean | string | number) => toggleUnlocked(row.index, v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('dc.blueprints.isNew')" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.isNew"
            @update:model-value="(v: boolean | string | number) => toggleNew(row.index, v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('dc.blueprints.investedCells')" width="160">
        <template #default="{ row }">
          <el-input-number
            :model-value="row.investedCells"
            :min="0"
            :max="2147483647"
            size="small"
            controls-position="right"
            @update:model-value="(v: number | undefined) => changeCells(row.index, v ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.dc-empty {
  opacity: 0.7;
  margin: 0;
}
.name-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.raw-id {
  font-size: 11px;
  opacity: 0.45;
}
</style>
