<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { setCurrentMoney } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const money = computed(() => {
  void editor.rev
  return editor.save.currentMoney
})
const playTime = computed(() => {
  void editor.rev
  return editor.save.playTime
})
const winNum = computed(() => {
  void editor.rev
  return editor.save.winNum
})

function onMoney(v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setCurrentMoney(editor.save, v))
}
</script>

<template>
  <div class="ffr-records" :data-ss-rev="editor.rev">
    <p class="hint">{{ t('ffr.hint.quitAndCloud') }}</p>
    <el-form label-width="140px">
      <el-form-item :label="t('ffr.records.gil')">
        <el-input-number :model-value="money" :min="0" :max="99999999" @update:model-value="onMoney" />
      </el-form-item>
      <el-form-item :label="t('ffr.records.playTime')">
        <span>{{ playTime }}</span>
      </el-form-item>
      <el-form-item :label="t('ffr.records.winNum')">
        <span>{{ winNum }}</span>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.ffr-records {
  max-width: 520px;
}
.hint {
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}
</style>
