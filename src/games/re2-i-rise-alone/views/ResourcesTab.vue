<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { RESOURCE_KEYS, type ResourceKey } from '../model/resources'
import { setResource } from '../parse'
import { useRe2IraEditor } from './inject'

const editor = useRe2IraEditor()
const resources = computed(() => {
  void editor.rev
  return editor.save.resources
})

function change(key: ResourceKey, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setResource(editor.save, key, Math.trunc(v))
  })
}
</script>

<template>
  <div class="r2ira-resources" :data-ss-rev="editor.rev">
    <p class="r2ira-hint">{{ t('r2ira.resources.hint') }}</p>
    <el-form label-width="120px" style="max-width: 420px">
      <el-form-item v-for="key in RESOURCE_KEYS" :key="key" :label="t(`r2ira.resources.${key}`)">
        <el-input-number
          :model-value="resources[key]"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => change(key, v ?? undefined)"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.r2ira-hint {
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  max-width: 520px;
  line-height: 1.5;
}
</style>
