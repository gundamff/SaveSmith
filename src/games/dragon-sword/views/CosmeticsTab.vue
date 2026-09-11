<script setup lang="ts">
import { computed } from 'vue'
import { catalogLabel } from '../catalog'
import { t } from '../i18n'
import { useDsEditor } from './inject'

interface CostumeSnapshot {
  index: number
  costumeCid: number
  equipCharacterCid: number
}

interface VehicleSnapshot {
  index: number
  vehicleDbid: string
  vehicleCid: number
}

interface MountSnapshot {
  index: number
  characterCid: number
  vehicleDbid: string
}

const editor = useDsEditor()

const costumeRows = computed((): CostumeSnapshot[] => {
  void editor.rev
  return editor.save.costumes.map((row, index) => ({
    index,
    costumeCid: row.costumeCid,
    equipCharacterCid: row.equipCharacterCid
  }))
})

const vehicleRows = computed((): VehicleSnapshot[] => {
  void editor.rev
  return editor.save.vehicles.map((row, index) => ({
    index,
    vehicleDbid: row.vehicleDbid,
    vehicleCid: row.vehicleCid
  }))
})

const mountRows = computed((): MountSnapshot[] => {
  void editor.rev
  return editor.save.equipMounts.map((row, index) => ({
    index,
    characterCid: row.characterCid,
    vehicleDbid: row.vehicleDbid
  }))
})

const characterCids = computed((): number[] => {
  void editor.rev
  return editor.save.characters.map((row) => row.characterCid)
})

function allowedEquipCid(cid: number): boolean {
  if (cid === 0) return true
  return editor.save.characters.some((row) => row.characterCid === cid)
}

function allowedVehicleDbid(dbid: string): boolean {
  if (dbid === '0') return true
  return editor.save.vehicles.some((row) => row.vehicleDbid === dbid)
}

function changeCostumeEquip(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  const cid = Math.floor(v)
  if (!allowedEquipCid(cid)) return
  editor.markDirty(() => {
    const row = editor.save.costumes[index]
    if (!row) return
    row.equipCharacterCid = cid
  })
}

function changeMountVehicle(index: number, v: string | number | undefined): void {
  if (v === undefined) return
  const dbid = String(v)
  if (!allowedVehicleDbid(dbid)) return
  editor.markDirty(() => {
    const row = editor.save.equipMounts[index]
    if (!row) return
    row.vehicleDbid = dbid
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p class="ds-hint">{{ t('cosmetics.ownedHint') }}</p>
    <h4 class="section">{{ t('cosmetics.costume') }}</h4>
    <p v-if="costumeRows.length === 0" class="ds-empty">{{ t('cosmetics.empty') }}</p>
    <el-table v-else :data="costumeRows" size="small" max-height="280" row-key="index" class="gap">
      <el-table-column :label="t('cosmetics.cid')" min-width="120">
        <template #default="{ row }">{{ catalogLabel(row.costumeCid) }}</template>
      </el-table-column>
      <el-table-column :label="t('cosmetics.equip')" min-width="180">
        <template #default="{ row }">
          <el-select
            size="small"
            :model-value="row.equipCharacterCid"
            @update:model-value="(v) => changeCostumeEquip(row.index, v as number | undefined)"
          >
            <el-option :value="0" :label="t('cosmetics.unequip')" />
            <el-option v-for="cid in characterCids" :key="cid" :value="cid" :label="catalogLabel(cid)" />
          </el-select>
        </template>
      </el-table-column>
    </el-table>

    <h4 class="section">{{ t('cosmetics.vehicle') }}</h4>
    <p v-if="vehicleRows.length === 0" class="ds-empty">{{ t('cosmetics.emptyVehicles') }}</p>
    <el-table v-else :data="vehicleRows" size="small" max-height="240" row-key="vehicleDbid" class="gap">
      <el-table-column :label="t('cosmetics.cid')" min-width="120">
        <template #default="{ row }">{{ catalogLabel(row.vehicleCid) }}</template>
      </el-table-column>
    </el-table>

    <h4 class="section">{{ t('cosmetics.mounts') }}</h4>
    <p v-if="mountRows.length === 0" class="ds-empty">{{ t('cosmetics.emptyMounts') }}</p>
    <el-table v-else :data="mountRows" size="small" max-height="280" row-key="index">
      <el-table-column :label="t('cosmetics.character')" min-width="120">
        <template #default="{ row }">{{ catalogLabel(row.characterCid) }}</template>
      </el-table-column>
      <el-table-column :label="t('cosmetics.vehicle')" min-width="180">
        <template #default="{ row }">
          <el-select
            size="small"
            :model-value="row.vehicleDbid"
            @update:model-value="(v) => changeMountVehicle(row.index, v as string | number | undefined)"
          >
            <el-option value="0" :label="t('cosmetics.unequip')" />
            <el-option
              v-for="veh in vehicleRows"
              :key="veh.vehicleDbid"
              :value="veh.vehicleDbid"
              :label="catalogLabel(veh.vehicleCid)"
            />
          </el-select>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.ds-hint {
  opacity: 0.75;
  font-size: 13px;
  margin: 0 0 8px;
}
.section {
  margin: 16px 0 8px;
  font-size: 14px;
}
.section:first-of-type {
  margin-top: 0;
}
.ds-empty {
  opacity: 0.7;
  margin: 0 0 8px;
}
.gap {
  margin-bottom: 12px;
}
</style>
