<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, locale } from '@host/i18n'
import { catalogLabel } from '../catalog/names'
import { libraScanAll, libraScanEnemy, setBestiaryDefeat } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()
const filter = ref('')

const rows = computed(() => {
  void editor.rev
  const loc = locale.value === 'zh' ? 'zh' : 'en'
  const q = filter.value.trim().toLowerCase()
  return editor.save.bestiary
    .map((b) => ({
      ...b,
      name: catalogLabel('enemy', b.saveId, loc)
    }))
    .filter((b) => !q || String(b.saveId).includes(q) || b.name.toLowerCase().includes(q))
})

function onDefeat(index: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setBestiaryDefeat(editor.save, index, v))
}

function onLibra(index: number) {
  editor.markDirty(() => libraScanEnemy(editor.save, index))
}

function onLibraAll() {
  editor.markDirty(() => libraScanAll(editor.save))
}
</script>

<template>
  <div class="ffr-bestiary" :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-input v-model="filter" :placeholder="t('ffr.bestiary.filter')" clearable style="max-width: 240px" />
      <el-button type="primary" @click="onLibraAll">{{ t('ffr.bestiary.libraAll') }}</el-button>
    </div>
    <el-table :data="rows" stripe height="480">
      <el-table-column prop="saveId" :label="t('ffr.bestiary.id')" width="90" />
      <el-table-column prop="name" :label="t('ffr.bestiary.name')" min-width="140" />
      <el-table-column :label="t('ffr.bestiary.defeat')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.defeatNum"
            :min="0"
            @update:model-value="(v) => onDefeat(row.index, v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.bestiary.analyzed')" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isAnalyzed ? 'success' : 'info'" size="small">
            {{ row.isAnalyzed ? t('ffr.bestiary.yes') : t('ffr.bestiary.no') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.bestiary.actions')" width="120">
        <template #default="{ row }">
          <el-button size="small" @click="onLibra(row.index)">{{ t('ffr.bestiary.libra') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
</style>
