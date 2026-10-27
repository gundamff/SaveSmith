<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, locale } from '@host/i18n'
import { addOrSetInventoryItem } from '../actions'
import { catalogLabel } from '../catalog/names'
import namesJson from '../catalog/names.json'
import { setInventoryNum } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()
const newId = ref<number | undefined>(1)
const newNum = ref(1)

const loc = computed(() => (locale.value === 'zh' ? 'zh' : 'en') as 'zh' | 'en')

const itemOptions = computed(() => {
  const L = loc.value
  const opts: Array<{ value: number; label: string }> = []
  for (const key of Object.keys(namesJson as Record<string, unknown>)) {
    if (!key.startsWith('item:')) continue
    const id = Number(key.slice(5))
    if (!Number.isFinite(id) || id <= 0) continue
    opts.push({ value: id, label: catalogLabel('item', id, L) })
  }
  return opts.sort((a, b) => a.value - b.value)
})

const rows = computed(() => {
  void editor.rev
  const L = loc.value
  return editor.save.inventory.map((r, i) => ({
    i,
    ...r,
    name: catalogLabel('item', r.itemId, L)
  }))
})

function onNum(i: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setInventoryNum(editor.save, i, v))
}

function onAdd() {
  if (newId.value == null || newId.value <= 0) return
  editor.markDirty(() => addOrSetInventoryItem(editor.save, newId.value!, newNum.value))
}
</script>

<template>
  <div class="ffr-items" :data-ss-rev="editor.rev">
    <div class="add-row">
      <el-select
        v-model="newId"
        filterable
        :placeholder="t('ffr.items.pick')"
        style="min-width: 260px"
      >
        <el-option
          v-for="opt in itemOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-input-number v-model="newNum" :min="1" :max="99" />
      <el-button type="primary" @click="onAdd">{{ t('ffr.items.add') }}</el-button>
    </div>
    <el-table :data="rows" stripe height="440">
      <el-table-column prop="name" :label="t('ffr.items.name')" min-width="180" />
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
  flex-wrap: wrap;
}
</style>
