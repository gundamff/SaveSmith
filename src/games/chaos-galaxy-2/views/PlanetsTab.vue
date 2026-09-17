<script setup lang="ts">
import { computed } from 'vue'
import { getEntry } from '../model/es3-binary'
import { buildingById, factionOptions, gameData, planetById } from '../model/gameData'
import type { PlanetField } from '../model/saveModel'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

const SCALAR_SUFFIX: Record<'faction' | 'defense' | 'resistance' | 'labourPoint' | 'hqLevel', string> = {
  faction: 'Faction',
  defense: 'Defense',
  resistance: 'Resistance',
  labourPoint: 'LabourPoint',
  hqLevel: 'HQlevel'
}

interface PlanetTableRow {
  index: number
  id: number
  name: string
  faction: number
  defense: number
  resistance: number
  labourPoint: number
  hqLevel: number
  buildings: string
}

const editor = useCg2Editor()
const PLANET_LABOUR_MAX = 9999
const PLANET_RESISTANCE_MAX = 9999
const factions = factionOptions(gameData)

const planets = computed((): PlanetTableRow[] => {
  void editor.rev
  return editor.save.listPlanetIds().map((id, index) => {
    const p = editor.save.getPlanet(id)
    return {
      index,
      id,
      name: planetById(gameData, id)?.name || t('planets.planetFallback', id),
      faction: p.faction,
      defense: p.defense,
      resistance: p.resistance,
      labourPoint: p.labourPoint,
      hqLevel: p.hqLevel,
      buildings: formatBuildings(p.orbitalBuilding, p.surfaceBuilding)
    }
  })
})

function formatBuildings(orbital?: number[], surface?: number[]): string {
  const names = [...(orbital ?? []), ...(surface ?? [])]
    .filter((id) => id > 0)
    .map((id) => buildingById(gameData, id)?.name ?? `#${id}`)
  return names.length ? names.join(' / ') : '—'
}

function wrap(fn: () => void): void {
  editor.markDirty(fn)
}

function hasScalar(id: number, field: keyof typeof SCALAR_SUFFIX): boolean {
  return !!getEntry(editor.save.entries, `Planet${id}${SCALAR_SUFFIX[field]}`)
}

function onField(id: number, field: PlanetField, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  if (field in SCALAR_SUFFIX && !hasScalar(id, field as keyof typeof SCALAR_SUFFIX)) return
  wrap(() => editor.save.setPlanetField(id, field, v))
}

function maxAllStats(): void {
  wrap(() => {
    for (const id of editor.save.listPlanetIds()) {
      if (hasScalar(id, 'defense')) {
        editor.save.setPlanetField(id, 'defense', gameData.planetMaxDefense)
      }
      if (hasScalar(id, 'hqLevel')) {
        editor.save.setPlanetField(id, 'hqLevel', gameData.planetMaxHqLevel)
      }
    }
  })
}
</script>

<template>
  <div v-if="editor.save" :data-ss-rev="editor.rev">
    <el-alert type="warning" show-icon :closable="false" :title="t('planets.warn')" class="warn" />
    <div class="toolbar">
      <el-button type="primary" @click="maxAllStats()">{{ t('planets.maxAll') }}</el-button>
      <span class="count">{{ t('planets.count', planets.length) }}</span>
    </div>
    <el-table :data="planets" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('planets.planet')" min-width="140">
        <template #default="{ row }">{{ row.name }} <span class="id">#{{ row.id }}</span></template>
      </el-table-column>
      <el-table-column :label="t('planets.faction')" min-width="180">
        <template #default="{ row }">
          <el-select
            size="small"
            filterable
            :model-value="row.faction"
            style="width: 100%"
            @update:model-value="(v) => onField(row.id, 'faction', v ?? undefined)"
          >
            <el-option v-for="o in factions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="t('planets.defense')" width="160">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.defense"
            :min="0"
            :max="gameData.planetMaxDefense"
            controls-position="right"
            @update:model-value="(v) => onField(row.id, 'defense', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('planets.resistance')" width="150">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.resistance"
            :min="0"
            :max="PLANET_RESISTANCE_MAX"
            controls-position="right"
            @update:model-value="(v) => onField(row.id, 'resistance', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('planets.labour')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.labourPoint"
            :min="0"
            :max="PLANET_LABOUR_MAX"
            controls-position="right"
            @update:model-value="(v) => onField(row.id, 'labourPoint', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('planets.hq')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.hqLevel"
            :min="0"
            :max="gameData.planetMaxHqLevel"
            controls-position="right"
            @update:model-value="(v) => onField(row.id, 'hqLevel', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('planets.buildings')" min-width="180">
        <template #default="{ row }">{{ row.buildings }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.warn { margin-bottom: 12px; }
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.count { color: #909399; font-size: 13px; }
.id { color: #909399; font-size: 12px; }
</style>
