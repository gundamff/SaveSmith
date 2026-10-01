<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import {
  projectUser,
  setItemInvestedCells,
  setItemIsNew,
  setItemUnlocked,
  type ItemRow
} from '../model/userModel'
import { useDcEditor } from './inject'

const editor = useDcEditor()
const rows = computed((): ItemRow[] => {
  void editor.rev
  return projectUser(editor.save.doc).items.map((i) => ({ ...i }))
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
      <el-table-column prop="itemId" :label="t('dc.blueprints.itemId')" min-width="180" />
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
</style>
