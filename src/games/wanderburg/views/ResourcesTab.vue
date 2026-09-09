<script setup lang="ts">
import { computed } from 'vue'
import { listResourceFields, setByPath } from '../model/saveModel'
import { useWbEditor } from './inject'

const editor = useWbEditor()
const fields = computed(() => listResourceFields(editor.save.doc))

function changeNum(path: string): (v: number | undefined) => void {
  return (v) => {
    if (v === undefined) return
    editor.markDirty(() => setByPath(editor.save.doc, path, v))
  }
}
</script>

<template>
  <el-form label-width="220px" style="max-width: 640px">
    <el-form-item v-for="f in fields" :key="f.path" :label="f.path">
      <el-input-number :model-value="f.value" :min="0" @change="changeNum(f.path)" />
    </el-form-item>
  </el-form>
</template>
