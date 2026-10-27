<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, locale } from '@host/i18n'
import { addOrSetInventoryItem } from '../actions'
import { catalogLabel } from '../catalog/names'
import { setInventoryNum } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()
const newId = ref(1)
const newNum = ref(1)

const rows = computed(() => {
  void editor.rev
  const loc = locale.value === 'zh' ? 'zh' : 'en'
  return editor.save.inventory.map((r, i) => ({
    i,
    ...r,
    name: catalogLabel('item', r.itemId, loc)
  }))
})

function onNum(i: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setInventoryNum(editor.save, i, v))
}

function onAdd() {
  editor.markDirty(() => addOrSetInventoryItem(editor.save, newId.value, newNum.value))
}
</script>

<template>
  <div class="ffr-items" :data-ss-rev="editor.rev">
    <div class="add-row">
      <el-input-number v-model="newId" :min="1" />
      <el-input-number v-model="newNum" :min="1" :max="99" />
      <el-button type="primary" @click="onAdd">{{ t('ffr.items.add') }}</el-button>
    </div>
    <el-table :data="rows" stripe height="440">
      <el-table-column prop="itemId" :label="t('ffr.items.id')" width="100" />
      <el-table-column prop="name" :label="t('ffr.items.name')" min-width="140" />
      <el-table-column :label="t('ffr.items.num')" width="160">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.num"
            :min="0"
            :max="99"
            @update:model-value="(v) => onNum(row.i, v)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
</style>
