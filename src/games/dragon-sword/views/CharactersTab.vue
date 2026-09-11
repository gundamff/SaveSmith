<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { useDsEditor } from './inject'

const MAX = 99_999_999

interface CharacterSnapshot {
  index: number
  characterCid: number
  level: number
  exp: number
  ascend: number
}

const editor = useDsEditor()
const rows = computed((): CharacterSnapshot[] => {
  void editor.rev
  return editor.save.characters.map((row, index) => ({
    index,
    characterCid: row.characterCid,
    level: row.level,
    exp: row.exp,
    ascend: row.ascend
  }))
})

function changeNum(
  index: number,
  field: 'level' | 'exp' | 'ascend',
  v: number | undefined
): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.characters[index]
    if (!row) return
    row[field] = Math.max(0, Math.floor(v))
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p v-if="rows.length === 0" class="ds-empty">{{ t('characters.empty') }}</p>
    <el-table v-else :data="rows" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('characters.cid')" min-width="120">
        <template #default="{ row }">{{ row.characterCid }}</template>
      </el-table-column>
      <el-table-column :label="t('characters.level')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.level"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeNum(row.index, 'level', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('characters.exp')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.exp"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeNum(row.index, 'exp', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('characters.ascend')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.ascend"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeNum(row.index, 'ascend', v ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.ds-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
