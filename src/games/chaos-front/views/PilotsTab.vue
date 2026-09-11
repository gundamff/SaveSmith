<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { characterById, gameData } from '../model/gameData'
import { CHARACTER_MAX_EXP, characterLevelForExp } from '../model/level'
import { gameImage } from '../lib/images'
import { t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const pilots = computed(() => {
  void editor.rev
  return (editor.save?.characters ?? []).map((id, index) => ({
    id,
    index,
    name: characterById(gameData, id)?.name ?? `#${id}`,
    exp: editor.save.characterExps[index] ?? 0
  }))
})

function levelOf(exp: number): number {
  return characterLevelForExp(exp)
}
function setExp(index: number, v: number | undefined): void {
  if (v === undefined || v === null) return
  editor.markDirty(() => editor.save.setPilotExp(index, v))
}
function maxAll(): void {
  let n = 0
  editor.markDirty(() => {
    n = editor.save.maxAllPilots()
  })
  ElMessage.success(t('pilots.maxed', n))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('pilots.maxAll') }}</el-button>
      <span class="count">{{ t('pilots.count', pilots.length) }}</span>
    </div>
    <el-table :data="pilots" size="small" max-height="560">
      <el-table-column :label="t('pilots.portrait')" width="64">
        <template #default="{ row }">
          <img :src="gameImage(`portrait-${row.id}`)" class="avatar" />
        </template>
      </el-table-column>
      <el-table-column prop="name" :label="t('pilots.name')" min-width="120" />
      <el-table-column :label="t('pilots.level')" width="90">
        <template #default="{ row }"><el-tag>Lv{{ levelOf(row.exp) }}</el-tag></template>
      </el-table-column>
      <el-table-column :label="t('pilots.exp')" width="220">
        <template #default="{ row }">
          <el-input-number size="small" :model-value="row.exp" :min="0" :max="CHARACTER_MAX_EXP" :step="100" controls-position="right" @update:model-value="(v) => setExp(row.index, v ?? undefined)" />
        </template>
      </el-table-column>
      <el-table-column :label="t('pilots.progress')">
        <template #default="{ row }">
          <el-progress :percentage="Math.min(100, Math.round((row.exp / CHARACTER_MAX_EXP) * 100))" :stroke-width="10" />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.count { color: #909399; }
.avatar { width: 36px; height: 36px; image-rendering: pixelated; }
</style>
