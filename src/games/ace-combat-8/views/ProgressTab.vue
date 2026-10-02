<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '@host/i18n'
import { featureMaskLabel } from '../model/features'
import {
  applyPostCampaignUnlocks,
  applyPseudoNewGamePlus,
  setCompletionCount,
  setLastCompletedMissionId,
  setLastPlayedMissionId
} from '../model/campaignSave'
import { refreshView } from '../parse'
import { useAc8Editor } from './inject'

const editor = useAc8Editor()

const view = computed(() => {
  void editor.rev
  return editor.save.view
})

const featureLabel = computed(() => featureMaskLabel(view.value.featureFlagMask, locale.value))

function changeCompletion(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setCompletionCount(editor.save.patch, Math.floor(v))
    refreshView(editor.save)
  })
}

function changeLastCompleted(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setLastCompletedMissionId(editor.save.patch, Math.floor(v))
    refreshView(editor.save)
  })
}

function changeLastPlayed(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setLastPlayedMissionId(editor.save.patch, Math.floor(v))
    refreshView(editor.save)
  })
}

function runPostUnlocks(): void {
  editor.markDirty(() => {
    applyPostCampaignUnlocks(editor.save.patch)
    refreshView(editor.save)
  })
}

function runPseudoNgPlus(): void {
  editor.markDirty(() => {
    applyPseudoNewGamePlus(editor.save.patch)
    refreshView(editor.save)
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <el-alert type="info" show-icon :closable="false" :title="t('ac8.progress.hint')" class="warn" />
    <el-descriptions :column="1" border style="max-width: 720px; margin-bottom: 16px">
      <el-descriptions-item :label="t('ac8.progress.completionCount')">
        {{ view.completionCount }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('ac8.progress.lastCompleted')">
        {{ view.lastCompletedMissionId }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('ac8.progress.lastPlayed')">
        {{ view.lastPlayedMissionId }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('ac8.progress.featureFlags')">
        <code>0x{{ view.featureFlagMask.toString(16).toUpperCase() }}</code>
        — {{ featureLabel }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('ac8.progress.freeMissions')">
        {{ view.unlockedFreeMissionIds.length }} / 31
      </el-descriptions-item>
    </el-descriptions>

    <el-form label-width="220px" style="max-width: 640px">
      <el-form-item :label="t('ac8.progress.completionCount')">
        <el-input-number
          :model-value="view.completionCount"
          :min="0"
          :max="9"
          @update:model-value="changeCompletion"
        />
      </el-form-item>
      <el-form-item :label="t('ac8.progress.lastCompleted')">
        <el-input-number
          :model-value="view.lastCompletedMissionId"
          :min="0"
          :max="31"
          @update:model-value="changeLastCompleted"
        />
      </el-form-item>
      <el-form-item :label="t('ac8.progress.lastPlayed')">
        <el-input-number
          :model-value="view.lastPlayedMissionId"
          :min="0"
          :max="31"
          @update:model-value="changeLastPlayed"
        />
      </el-form-item>
    </el-form>

    <div class="actions">
      <el-button type="primary" @click="runPostUnlocks">{{ t('ac8.actions.postCampaignUnlocks') }}</el-button>
      <el-button type="warning" @click="runPseudoNgPlus">{{ t('ac8.actions.pseudoNgPlus') }}</el-button>
    </div>
  </div>
</template>

<style scoped>
.warn {
  margin-bottom: 16px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
</style>
