<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { setCurrentMrp, setTotalMrp } from '../model/campaignSave'
import { refreshView } from '../parse'
import { useAc8Editor } from './inject'

const editor = useAc8Editor()

const currentMrp = computed(() => {
  void editor.rev
  return Number(editor.save.view.currentMrp)
})
const totalMrp = computed(() => {
  void editor.rev
  return Number(editor.save.view.totalMrp)
})

function changeCurrent(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setCurrentMrp(editor.save.patch, BigInt(Math.max(0, Math.floor(v))))
    refreshView(editor.save)
  })
}

function changeTotal(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setTotalMrp(editor.save.patch, BigInt(Math.max(0, Math.floor(v))))
    refreshView(editor.save)
  })
}

function syncTotalToCurrent(): void {
  editor.markDirty(() => {
    const cur = editor.save.view.currentMrp
    setTotalMrp(editor.save.patch, cur)
    refreshView(editor.save)
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <el-alert type="warning" show-icon :closable="false" :title="t('ac8.hint.quitAndCloud')" class="warn" />
    <el-form label-width="220px" style="max-width: 640px">
      <el-form-item :label="t('ac8.resources.currentMrp')">
        <el-input-number
          :model-value="currentMrp"
          :min="0"
          :max="999999999"
          :step="10000"
          @update:model-value="changeCurrent"
        />
      </el-form-item>
      <el-form-item :label="t('ac8.resources.totalMrp')">
        <el-input-number
          :model-value="totalMrp"
          :min="0"
          :max="999999999"
          :step="10000"
          @update:model-value="changeTotal"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="syncTotalToCurrent">{{ t('ac8.resources.syncTotal') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.warn {
  margin-bottom: 16px;
}
</style>
