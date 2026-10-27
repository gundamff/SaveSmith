<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { setUnitField } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const rows = computed(() => {
  void editor.rev
  return editor.save.units.map((u) => ({ ...u }))
})

function patch(
  index: number,
  field: 'Experience' | 'HitPoint' | 'MagicPoint' | 'EquipWeaponId' | 'EquipArmorId' | 'equipVisionId',
  v: number | undefined
) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setUnitField(editor.save, index, field, v))
}
</script>

<template>
  <div class="ffr-status" :data-ss-rev="editor.rev">
    <el-table :data="rows" stripe height="480">
      <el-table-column prop="unitId" :label="t('ffr.status.unitId')" width="90" />
      <el-table-column :label="t('ffr.status.experience')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.experience"
            :min="0"
            @update:model-value="(v) => patch(row.index, 'Experience', v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.hp')" width="120">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.hitPoint"
            :min="0"
            @update:model-value="(v) => patch(row.index, 'HitPoint', v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.mp')" width="120">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.magicPoint"
            :min="0"
            @update:model-value="(v) => patch(row.index, 'MagicPoint', v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.weapon')" width="120">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.equipWeaponId"
            :min="0"
            @update:model-value="(v) => patch(row.index, 'EquipWeaponId', v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.armor')" width="120">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.equipArmorId"
            :min="0"
            @update:model-value="(v) => patch(row.index, 'EquipArmorId', v)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.vision')" width="120">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.equipVisionId"
            :min="0"
            @update:model-value="(v) => patch(row.index, 'equipVisionId', v)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
