<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { maxCollection } from '../model/saveModel'
import { t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const col = computed(() => {
  void editor.rev
  return editor.collection
})
const endingsCount = computed(() => {
  void editor.rev
  return col.value?.endings.filter(Boolean).length ?? 0
})

function maxAll(): void {
  editor.markDirty(() => {
    maxCollection(col.value!)
  })
  ElMessage.success(t('collection.maxed'))
}

function setEnding(i: number, on: string | number | boolean): void {
  editor.markDirty(() => {
    col.value!.endings[i] = on === true || on === i
  })
}
</script>

<template>
  <div v-if="col" :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('collection.maxAll') }}</el-button>
      <span class="count">{{ t('collection.endingsCount', endingsCount, col.endings.length) }}</span>
    </div>
    <el-alert type="info" show-icon :closable="false" :title="t('collection.useHostSave')" class="warn" />
    <el-alert type="info" show-icon :closable="false" :title="t('collection.warn')" class="warn" />
    <h4>{{ t('collection.endings') }}</h4>
    <el-checkbox-group :model-value="col.endings.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)">
      <el-checkbox
        v-for="(_, i) in col.endings"
        :key="i"
        :value="i"
        :label="t('collection.endingN', i + 1)"
        @change="(on) => setEnding(i, on)"
      />
    </el-checkbox-group>
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
.count { color: #909399; }
.warn { margin-bottom: 12px; max-width: 640px; }
</style>
