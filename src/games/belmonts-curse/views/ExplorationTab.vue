<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { useBcEditor } from './inject'

const editor = useBcEditor()

const worldKeyCount = computed(() => {
  void editor.rev
  return editor.save.exploration.worldKeyCount
})
const completionItemCount = computed(() => {
  void editor.rev
  return editor.save.exploration.completionItemCount
})
const entityCount = computed(() => {
  void editor.rev
  return editor.save.exploration.entityCount
})
</script>

<template>
  <div class="bc-exploration" :data-ss-rev="editor.rev">
    <el-descriptions :column="1" border>
      <el-descriptions-item :label="t('bc.exploration.worldKeyCount')">
        {{ worldKeyCount }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('bc.exploration.completionItemCount')">
        {{ completionItemCount }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('bc.exploration.entityCount')">
        {{ entityCount }}
      </el-descriptions-item>
    </el-descriptions>
    <p class="hint">{{ t('bc.exploration.readonlyHint') }}</p>
  </div>
</template>

<style scoped>
.bc-exploration {
  max-width: 560px;
}
.hint {
  margin: 12px 0 0;
  font-size: 12px;
  opacity: 0.7;
}
</style>
