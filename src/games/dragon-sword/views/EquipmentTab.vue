<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { useDsEditor } from './inject'

const MAX = 99_999_999

interface EquipmentSnapshot {
  index: number
  itemDbid: string
  itemCid: number
  enchantLevel: number
  exp: number
  isLock: number
  mainStatCid: number
  subStatCid1: number
  subStatCid2: number
  subStatCid3: number
  subStatCid4: number
  subStatCid5: number
}

const editor = useDsEditor()
const rows = computed((): EquipmentSnapshot[] => {
  void editor.rev
  return editor.save.equipment.map((row, index) => ({
    index,
    itemDbid: row.itemDbid,
    itemCid: row.itemCid,
    enchantLevel: row.enchantLevel,
    exp: row.exp,
    isLock: row.isLock,
    mainStatCid: row.mainStatCid,
    subStatCid1: row.subStatCid1,
    subStatCid2: row.subStatCid2,
    subStatCid3: row.subStatCid3,
    subStatCid4: row.subStatCid4,
    subStatCid5: row.subStatCid5
  }))
})

function changeEnchant(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.equipment[index]
    if (!row) return
    row.enchantLevel = Math.max(0, Math.floor(v))
  })
}

function changeExp(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.equipment[index]
    if (!row) return
    row.exp = Math.max(0, Math.floor(v))
  })
}

function changeLock(index: number, locked: boolean): void {
  editor.markDirty(() => {
    const row = editor.save.equipment[index]
    if (!row) return
    row.isLock = locked ? 1 : 0
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p v-if="rows.length === 0" class="ds-empty">{{ t('equipment.empty') }}</p>
    <el-table v-else :data="rows" size="small" max-height="560" row-key="itemDbid">
      <el-table-column :label="t('equipment.cid')" min-width="110">
        <template #default="{ row }">{{ row.itemCid }}</template>
      </el-table-column>
      <el-table-column :label="t('equipment.enchant')" width="170">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.enchantLevel"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeEnchant(row.index, v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('equipment.exp')" width="170">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.exp"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeExp(row.index, v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('equipment.lock')" width="90">
        <template #default="{ row }">
          <el-switch :model-value="row.isLock === 1" @update:model-value="(v) => changeLock(row.index, Boolean(v))" />
        </template>
      </el-table-column>
      <el-table-column :label="t('equipment.mainStat')" min-width="110">
        <template #default="{ row }">{{ row.mainStatCid }}</template>
      </el-table-column>
      <el-table-column :label="t('equipment.subStat')" min-width="180">
        <template #default="{ row }">{{ [row.subStatCid1, row.subStatCid2, row.subStatCid3, row.subStatCid4, row.subStatCid5].join(', ') }}</template>
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
