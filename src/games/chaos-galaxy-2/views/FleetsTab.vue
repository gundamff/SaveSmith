<script setup lang="ts">
import { computed } from 'vue'
import { getEntry, setScalar } from '../model/es3-binary'
import { commanderById, gameData, unitById } from '../model/gameData'
import type { FleetUnitSlot } from '../model/saveModel'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

interface UnitSlotRow {
  index: number
  fleetId: number
  slot: FleetUnitSlot
  typeId: number
  name: string
  fields: number[]
}

interface FleetTableRow {
  index: number
  id: number
  faction: number
  commander: number
  commanderName: string
  flagshipName: string
  units: UnitSlotRow[]
}

const editor = useCg2Editor()
const maxUnitId = Math.max(0, ...gameData.units.map((u) => u.id))
const TUPLE_MAX = 999999

const commanderOptions = computed(() => {
  void editor.rev
  return editor.save.listCommanderIds().map((id) => ({
    value: id,
    label: `${commanderById(gameData, id)?.name ?? t('commanders.nameFallback', id)} (#${id})`
  }))
})

const fleets = computed((): FleetTableRow[] => {
  void editor.rev
  return editor.save.listFleetIds().map((id, index) => {
    const fleet = editor.save.getFleet(id)
    const units: UnitSlotRow[] = []
    fleet.units.forEach((tuple, slotIndex) => {
      if (!tuple) return
      const typeId = tuple[0] ?? 0
      const slot = (slotIndex + 1) as FleetUnitSlot
      units.push({
        index: units.length,
        fleetId: id,
        slot,
        typeId,
        name: unitById(gameData, typeId)?.name || t('fleets.unitFallback', typeId),
        fields: tuple.slice()
      })
    })
    return {
      index,
      id,
      faction: fleet.faction,
      commander: fleet.commander,
      commanderName:
        commanderById(gameData, fleet.commander)?.name || t('commanders.nameFallback', fleet.commander),
      flagshipName: flagshipLabel(fleet.flagship),
      units
    }
  })
})

function flagshipLabel(flagship: number | number[] | null): string {
  if (flagship === null) return t('fleets.empty')
  const typeId = Array.isArray(flagship) ? (flagship[0] ?? 0) : flagship
  return unitById(gameData, typeId)?.name || t('fleets.unitFallback', typeId)
}

function setFaction(fleetId: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  if (!getEntry(editor.save.entries, `Fleet${fleetId}Faction`)) return
  editor.markDirty(() => setScalar(editor.save.entries, `Fleet${fleetId}Faction`, v))
}

function setCommander(fleetId: number, v: number | undefined | null): void {
  if (v === undefined || v === null || Number.isNaN(v)) return
  editor.markDirty(() => editor.save.setFleetCommander(fleetId, v))
}

function setUnitField(fleetId: number, slot: FleetUnitSlot, fieldIndex: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  const fleet = editor.save.getFleet(fleetId)
  const tuple = fleet.units[slot - 1]
  if (!tuple) return
  const next = tuple.slice()
  next[fieldIndex] = v
  editor.markDirty(() => editor.save.setFleetUnit(fleetId, slot, next))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <el-alert type="info" show-icon :closable="false" :title="t('fleets.noAdd')" class="warn" />
    <div class="toolbar">
      <span class="count">{{ t('fleets.count', fleets.length) }}</span>
    </div>
    <el-table :data="fleets" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('fleets.fleet')" width="90">
        <template #default="{ row }">#{{ row.id }}</template>
      </el-table-column>
      <el-table-column :label="t('fleets.faction')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.faction"
            :min="0"
            :max="99"
            controls-position="right"
            @update:model-value="(v) => setFaction(row.id, v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('fleets.commander')" min-width="180">
        <template #default="{ row }">
          <el-select
            size="small"
            :model-value="row.commander"
            style="width: 100%"
            filterable
            @update:model-value="(v) => setCommander(row.id, v)"
          >
            <el-option v-for="o in commanderOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="t('fleets.flagship')" min-width="140">
        <template #default="{ row }">{{ row.flagshipName }}</template>
      </el-table-column>
      <el-table-column :label="t('fleets.units')" min-width="420">
        <template #default="{ row }">
          <div v-if="row.units.length === 0" class="empty">{{ t('fleets.empty') }}</div>
          <div v-for="u in row.units" :key="u.slot" class="unit-row">
            <span class="slot">{{ t('fleets.slot', u.slot) }}</span>
            <span class="unit-name">{{ u.name }} #{{ u.typeId }}</span>
            <el-input-number
              v-for="(field, fi) in u.fields"
              :key="fi"
              size="small"
              :model-value="field"
              :min="0"
              :max="fi === 0 ? maxUnitId : TUPLE_MAX"
              controls-position="right"
              @update:model-value="(v) => setUnitField(u.fleetId, u.slot, Number(fi), v ?? undefined)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.warn { margin-bottom: 12px; }
.toolbar { margin-bottom: 12px; }
.count { color: #909399; font-size: 13px; }
.empty { color: #909399; }
.unit-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px; }
.slot { color: #909399; font-size: 12px; width: 48px; }
.unit-name { min-width: 100px; }
</style>
