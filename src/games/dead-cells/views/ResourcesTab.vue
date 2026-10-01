<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import type { HxsDoc } from '../model/hxbit'
import { projectUser, setDeathCells, setDeathMoney } from '../model/userModel'
import { useDcEditor } from './inject'

const editor = useDcEditor()
const view = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc)
})

function changeNum(setter: (doc: HxsDoc, v: number) => void, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setter(editor.save.doc, v))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p v-if="!view.editable" class="dc-empty">{{ t('dc.resources.unreadable') }}</p>
    <el-form v-else label-width="180px" style="max-width: 480px">
      <el-form-item :label="t('dc.resources.deathMoney')">
        <el-input-number
          :model-value="view.deathMoney"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => changeNum(setDeathMoney, v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('dc.resources.deathCells')">
        <el-input-number
          :model-value="view.deathCells"
          :min="0"
          :max="2147483647"
          @update:model-value="(v) => changeNum(setDeathCells, v ?? undefined)"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.dc-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
