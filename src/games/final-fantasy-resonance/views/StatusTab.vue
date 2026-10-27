<script setup lang="ts">
import { computed } from 'vue'
import { t, locale } from '@host/i18n'
import {
  allowedArmors,
  allowedWeapons,
  equipOptionLabel,
  getEquip,
  type EquipEntry
} from '../catalog/equipment'
import { catalogLabel } from '../catalog/names'
import { setUnitField } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const loc = computed(() => (locale.value === 'zh' ? 'zh' : 'en') as 'zh' | 'en')

const rows = computed(() => {
  void editor.rev
  const L = loc.value
  const visionIds = editor.save.visions.map((v) => v.id)
  return editor.save.units.map((u) => {
    const weapons = ensureCurrent(allowedWeapons(u.unitId, u.equipWeaponId), u.equipWeaponId)
    const armors = ensureCurrent(allowedArmors(u.unitId), u.equipArmorId)
    return {
      ...u,
      name: catalogLabel('unit', u.unitId, L),
      weaponOptions: weapons.map((e) => ({
        value: e.id,
        label: equipOptionLabel(e.id, L)
      })),
      armorOptions: armors
        .filter((e) => e.id > 0)
        .map((e) => ({ value: e.id, label: equipOptionLabel(e.id, L) })),
      visionOptions: ensureId(visionIds, u.equipVisionId).map((id) => ({
        value: id,
        label: catalogLabel('vision', id, L)
      }))
    }
  })
})

function ensureCurrent(list: EquipEntry[], currentId: number): EquipEntry[] {
  if (currentId <= 0) return list
  if (list.some((e) => e.id === currentId)) return list
  const orphan = getEquip(currentId)
  if (orphan) return [orphan, ...list]
  return [{ id: currentId, kind: 'weapon', subtype: 0, en: `#${currentId}` }, ...list]
}

function ensureId(ids: number[], current: number): number[] {
  const out = [...ids]
  if (current > 0 && !out.includes(current)) out.unshift(current)
  return out
}

function patch(
  index: number,
  field: 'Experience' | 'HitPoint' | 'MagicPoint' | 'EquipWeaponId' | 'EquipArmorId' | 'equipVisionId',
  v: number | undefined | null
) {
  if (v === undefined || v === null || Number.isNaN(v)) return
  editor.markDirty(() => setUnitField(editor.save, index, field, v))
}
</script>

<template>
  <div class="ffr-status" :data-ss-rev="editor.rev">
    <p class="hint">{{ t('ffr.status.equipHint') }}</p>
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
      <el-table-column :label="t('ffr.status.weapon')" min-width="200">
        <template #default="{ row }">
          <el-select
            size="small"
            filterable
            :model-value="row.equipWeaponId"
            @update:model-value="(v) => patch(row.index, 'EquipWeaponId', v)"
          >
            <el-option
              v-for="opt in row.weaponOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.armor')" min-width="200">
        <template #default="{ row }">
          <el-select
            size="small"
            filterable
            clearable
            :model-value="row.equipArmorId || undefined"
            @clear="patch(row.index, 'EquipArmorId', 0)"
            @update:model-value="(v) => patch(row.index, 'EquipArmorId', v ?? 0)"
          >
            <el-option
              v-for="opt in row.armorOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="t('ffr.status.vision')" min-width="200">
        <template #default="{ row }">
          <el-select
            size="small"
            filterable
            clearable
            :model-value="row.equipVisionId || undefined"
            @clear="patch(row.index, 'equipVisionId', 0)"
            @update:model-value="(v) => patch(row.index, 'equipVisionId', v ?? 0)"
          >
            <el-option
              v-for="opt in row.visionOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.hint {
  color: var(--el-text-color-secondary);
  margin: 0 0 8px;
  font-size: 13px;
}
.ffr-status :deep(.el-select) {
  width: 100%;
}
</style>
