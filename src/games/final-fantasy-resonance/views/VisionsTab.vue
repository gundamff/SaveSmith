<script setup lang="ts">
import { computed } from 'vue'
import { t, locale } from '@host/i18n'
import { catalogLabel } from '../catalog/names'
import { setVisionAwakening, setVisionSynchro } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const rows = computed(() => {
  void editor.rev
  const loc = locale.value === 'zh' ? 'zh' : 'en'
  return editor.save.visions.map((v) => ({
    index: v.index,
    id: v.id,
    name: catalogLabel('vision', v.id, loc),
    awakeningPoint: v.awakeningPoint,
    synchroSum: v.synchro.reduce((a, s) => a + s.value, 0),
    synchro: v.synchro.map((s) => ({ ...s }))
  }))
})

function onAwaken(index: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setVisionAwakening(editor.save, index, v))
}

function maxSynchro(index: number) {
  editor.markDirty(() => {
    const vision = editor.save.visions.find((x) => x.index === index)
    if (!vision) return
    vision.synchro.forEach((_, j) => setVisionSynchro(editor.save, index, j, 9999))
  })
}
</script>

<template>
  <div class="ffr-visions" :data-ss-rev="editor.rev">
    <el-table :data="rows" stripe height="480">
      <el-table-column prop="name" :label="t('ffr.visions.name')" min-width="140" />
      <el-table-column :label="t('ffr.visions.awakening')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.awakeningPoint"
            :min="0"
            :max="4"
            @update:model-value="(v) => onAwaken(row.index, v)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="synchroSum" :label="t('ffr.visions.synchroSum')" width="120" />
      <el-table-column :label="t('ffr.visions.actions')" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="maxSynchro(row.index)">{{ t('ffr.visions.maxSynchro') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
