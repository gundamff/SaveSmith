<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { listResourceFields, setByPath } from '../model/saveModel'
import { useWbEditor } from './inject'

const editor = useWbEditor()
const fields = computed(() => listResourceFields(editor.save.doc))

function changeNum(path: string, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setByPath(editor.save.doc, path, v))
}
</script>

<template>
  <p v-if="fields.length === 0" class="wb-empty">{{ t('wb.resources.empty') }}</p>
  <el-form v-else label-width="180px" style="max-width: 480px">
    <el-form-item v-for="f in fields" :key="f.path" :label="t(f.labelKey)">
      <el-input-number
        :model-value="f.value"
        :min="0"
        @update:model-value="(v) => changeNum(f.path, v ?? undefined)"
      />
    </el-form-item>
  </el-form>
</template>

<style scoped>
.wb-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
