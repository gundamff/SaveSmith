<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, locale } from '@host/i18n'
import { setOrAddArtifact } from '../actions'
import { catalogLabel } from '../catalog/names'
import { setArtifactActive } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()
const newId = ref(1)

const hasList = computed(() => {
  void editor.rev
  return editor.save.hasArtifactList
})

const rows = computed(() => {
  void editor.rev
  const loc = locale.value === 'zh' ? 'zh' : 'en'
  return editor.save.artifacts.map((a) => ({
    ...a,
    name: catalogLabel('item', a.itemId, loc)
  }))
})

function onActive(index: number, v: string | number | boolean) {
  editor.markDirty(() => setArtifactActive(editor.save, index, Boolean(v)))
}

function onAdd() {
  editor.markDirty(() => setOrAddArtifact(editor.save, newId.value, true))
}
</script>

<template>
  <div class="ffr-artifacts" :data-ss-rev="editor.rev">
    <p v-if="!hasList" class="hint">{{ t('ffr.artifacts.missing') }}</p>
    <template v-else>
      <div class="add-row">
        <el-input-number v-model="newId" :min="1" />
        <el-button type="primary" @click="onAdd">{{ t('ffr.artifacts.add') }}</el-button>
      </div>
      <el-table :data="rows" stripe height="440">
        <el-table-column prop="itemId" :label="t('ffr.artifacts.id')" width="100" />
        <el-table-column prop="name" :label="t('ffr.artifacts.name')" min-width="140" />
        <el-table-column :label="t('ffr.artifacts.active')" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.active"
              @change="(v: string | number | boolean) => onActive(row.index, v)"
            />
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.hint {
  color: var(--el-text-color-secondary);
}
.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
