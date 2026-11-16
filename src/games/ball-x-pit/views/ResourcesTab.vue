<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { setResources } from '../parse'
import { useBxpEditor } from './inject'

const editor = useBxpEditor()
const resources = computed(() => {
  void editor.rev
  return editor.save.resources
})

function change(key: 'money' | 'rice' | 'wood' | 'stone', v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setResources(editor.save, { ...editor.save.resources, [key]: Math.trunc(v) })
  })
}
</script>

<template>
  <div class="bxp-resources" :data-ss-rev="editor.rev">
    <p class="bxp-hint">{{ t('bxp.resources.hint') }}</p>
    <el-form label-width="120px" style="max-width: 420px">
      <el-form-item :label="t('bxp.resources.money')">
        <el-input-number
          :model-value="resources.money"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => change('money', v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('bxp.resources.rice')">
        <el-input-number
          :model-value="resources.rice"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => change('rice', v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('bxp.resources.wood')">
        <el-input-number
          :model-value="resources.wood"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => change('wood', v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('bxp.resources.stone')">
        <el-input-number
          :model-value="resources.stone"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => change('stone', v ?? undefined)"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.bxp-hint {
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  max-width: 520px;
  line-height: 1.5;
}
</style>
