<script setup lang="ts">
import { computed } from 'vue'
import { locale } from '@host/i18n'
import { displayName, listUnlockEntries, setUnlock } from '../model/saveModel'
import { useWbEditor } from './inject'

const editor = useWbEditor()
const entries = computed(() => listUnlockEntries(editor.save.doc))
const unlockedIds = computed(() =>
  entries.value.filter((e) => e.unlocked).map((e) => e.id)
)

const selectAllLabel = computed(() => (locale.value === 'zh' ? '全选' : 'Select all'))
const clearAllLabel = computed(() => (locale.value === 'zh' ? '全不选' : 'Clear all'))

function toggle(id: string, on: string | number | boolean): void {
  const enabled = on === true || on === id
  editor.markDirty(() => setUnlock(editor.save.doc, id, enabled))
}

function selectAll(on: boolean): void {
  editor.markDirty(() => {
    for (const e of listUnlockEntries(editor.save.doc)) {
      setUnlock(editor.save.doc, e.id, on)
    }
  })
}
</script>

<template>
  <div>
    <p class="hint">{{ locale === 'zh' ? '下列为存档里的解锁 ID（模块/载具/船长等）。名称表尚未从游戏导出，暂显示编号。' : 'These are unlock IDs from the save (modules / vehicles / captains, etc.). Names are not mapped yet, so IDs are shown.' }}</p>
    <div class="toolbar">
      <el-button type="primary" @click="selectAll(true)">{{ selectAllLabel }}</el-button>
      <el-button @click="selectAll(false)">{{ clearAllLabel }}</el-button>
    </div>
    <el-checkbox-group class="item-row" :model-value="unlockedIds">
      <el-checkbox
        v-for="e in entries"
        :key="e.id"
        :value="e.id"
        @change="(on) => toggle(e.id, on)"
      >
        {{ displayName(e.id) }}
      </el-checkbox>
    </el-checkbox-group>
  </div>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  opacity: 0.75;
  line-height: 1.45;
}
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.item-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}
</style>
