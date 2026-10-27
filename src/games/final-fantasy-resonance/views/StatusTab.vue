<script setup lang="ts">
import { computed } from 'vue'
import { t, locale } from '@host/i18n'
import { catalogLabel } from '../catalog/names'
import { setUnitField } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const rows = computed(() => {
  void editor.rev
  const loc = locale.value === 'zh' ? 'zh' : 'en'
  return editor.save.units.map((u) => ({
    ...u,
    name: catalogLabel('unit', u.unitId, loc),
    weaponName: catalogLabel('item', u.equipWeaponId, loc),
    armorName: catalogLabel('item', u.equipArmorId, loc),
    visionName: catalogLabel('vision', u.equipVisionId, loc)
  }))
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
      <el-table-column prop="name" :label="t('ffr.status.name')" min-width="140" />
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
      <el-table-column :label="t('ffr.status.weapon')" min-width="160">
        <template #default="{ row }">
          <div class="equip">
            <span class="equip-name">{{ row.weaponName }}</span>
            <el-input-number
              size="small"
              :model-value="row.equipWeaponId"
              :min="0"
              @update:model-value="(v) => patch(row.index, 'EquipWeaponId', v)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.armor')" min-width="160">
        <template #default="{ row }">
          <div class="equip">
            <span class="equip-name">{{ row.armorName }}</span>
            <el-input-number
              size="small"
              :model-value="row.equipArmorId"
              :min="0"
              @update:model-value="(v) => patch(row.index, 'EquipArmorId', v)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.vision')" min-width="160">
        <template #default="{ row }">
          <div class="equip">
            <span class="equip-name">{{ row.visionName }}</span>
            <el-input-number
              size="small"
              :model-value="row.equipVisionId"
              :min="0"
              @update:model-value="(v) => patch(row.index, 'equipVisionId', v)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.equip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.equip-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
}
</style>
