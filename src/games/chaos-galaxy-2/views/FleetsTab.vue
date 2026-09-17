<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getEntry, setScalar } from '../model/es3-binary'
import { commanderById, factionLabel, factionOptions, gameData, unitById } from '../model/gameData'
import type { FleetUnitSlot } from '../model/saveModel'
import { t } from '../i18n'
import { useDeferredReady } from './deferredReady'
import { useCg2Editor } from './inject'

interface SelectOption {
  value: number
  label: string
}

interface UnitSlotView {
  index: number
  fleetId: number
  slot: FleetUnitSlot
  typeId: number
  name: string
  fields: number[]
}

interface FleetCard {
  index: number
  id: number
  faction: number
  commander: number
  commanderName: string
  flagshipType: number | null
  units: UnitSlotView[]
}

const editor = useCg2Editor()
const TUPLE_MAX = 999999
/** Cards are tall; keep pages small. */
const PAGE_SIZE = 5
const filterMode = ref<'mine' | 'all'>('mine')
const page = ref(1)
/** `c-{fleetId}` | `f-{fleetId}` | `u-{fleetId}-{slot}` | `fac-{fleetId}` while that dropdown is open */
const openSelectKey = ref<string | null>(null)
const factionOpts = factionOptions(gameData)

/** Defer heavy list rebuild when switching mine/all (and on first mount). */
const { loading, ready } = useDeferredReady([filterMode])

const unitOptions: SelectOption[] = [
  { value: 0, label: t('fleets.empty') },
  ...gameData.units.map((u) => ({
    value: u.id,
    label: `${u.name} (#${u.id})`
  }))
]

const commanderOptions = computed((): SelectOption[] => {
  void editor.rev
  return editor.save.listCommanderIds().map((id) => ({
    value: id,
    label: `${commanderById(gameData, id)?.name ?? t('commanders.nameFallback', id)} (#${id})`
  }))
})

function flagshipTypeId(flagship: number | number[]): number {
  return Array.isArray(flagship) ? (flagship[0] ?? 0) : flagship
}

function fleetFactionOf(id: number): number {
  const entry = getEntry(editor.save.entries, `Fleet${id}Faction`)
  return typeof entry?.value === 'number' ? entry.value : -1
}

function buildFleetCard(id: number, index: number): FleetCard {
  const fleet = editor.save.getFleet(id)
  const units: UnitSlotView[] = []
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
    flagshipType: fleet.flagship === null ? null : flagshipTypeId(fleet.flagship),
    units
  }
}

/** IDs only — full fleet projection happens per page. */
const filteredFleetIds = computed((): number[] => {
  void editor.rev
  if (!ready.value) return []
  const ids = editor.save.listFleetIds()
  if (filterMode.value === 'all') return ids
  const play = editor.save.getPlayFaction()
  return ids.filter((id) => fleetFactionOf(id) === play)
})

const fleetCount = computed(() => filteredFleetIds.value.length)

const pageCount = computed(() => Math.max(1, Math.ceil(fleetCount.value / PAGE_SIZE)))

const pagedFleets = computed((): FleetCard[] => {
  if (!ready.value) return []
  const ids = filteredFleetIds.value
  const start = (page.value - 1) * PAGE_SIZE
  return ids.slice(start, start + PAGE_SIZE).map((id, offset) => buildFleetCard(id, start + offset))
})

watch(filterMode, () => {
  page.value = 1
  openSelectKey.value = null
})

watch(fleetCount, (n) => {
  const maxPage = Math.max(1, Math.ceil(n / PAGE_SIZE))
  if (page.value > maxPage) page.value = maxPage
})

function onSelectVisible(key: string, open: boolean): void {
  openSelectKey.value = open ? key : null
}

function visibleOptions(
  key: string,
  selected: number,
  kind: 'unit' | 'commander' | 'faction'
): SelectOption[] {
  const full =
    kind === 'unit' ? unitOptions : kind === 'commander' ? commanderOptions.value : factionOpts
  if (openSelectKey.value === key) return full
  const hit = full.find((o) => o.value === selected)
  if (hit) return [hit]
  if (kind === 'unit' && selected === 0) return [unitOptions[0]!]
  if (kind === 'faction') {
    return [{ value: selected, label: factionLabel(gameData, selected, t('resources.factionFallback')) }]
  }
  const fallback =
    kind === 'unit'
      ? unitById(gameData, selected)?.name || t('fleets.unitFallback', selected)
      : commanderById(gameData, selected)?.name || t('commanders.nameFallback', selected)
  return [{ value: selected, label: `${fallback} (#${selected})` }]
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

function setFlagshipType(fleetId: number, v: number | undefined | null): void {
  if (v === undefined || v === null || Number.isNaN(v)) return
  editor.markDirty(() => editor.save.setFleetFlagshipType(fleetId, v))
}

/** Save tuple: [typeId, level, power, energy] — power/energy cross-checked vs UnitTypeData. */
function tupleFieldLabel(fieldIndex: number): string {
  if (fieldIndex === 1) return t('fleets.level')
  if (fieldIndex === 2) return t('fleets.power')
  if (fieldIndex === 3) return t('fleets.energy')
  return t('fleets.field', fieldIndex)
}
</script>

<template>
  <div
    v-loading="loading"
    class="panel"
    :element-loading-text="t('fleets.loading')"
    :data-ss-rev="editor.rev"
  >
    <el-alert type="info" show-icon :closable="false" :title="t('fleets.noAdd')" class="warn" />
    <el-alert type="info" show-icon :closable="false" :title="t('fleets.tupleHint')" class="warn" />
    <div class="toolbar">
      <el-radio-group v-model="filterMode" size="small" :disabled="loading">
        <el-radio-button value="mine">{{ t('fleets.filterMine') }}</el-radio-button>
        <el-radio-button value="all">{{ t('fleets.filterAll') }}</el-radio-button>
      </el-radio-group>
      <span class="count">{{ t('fleets.count', fleetCount) }}</span>
    </div>

    <div v-if="ready" class="fleet-list">
      <article v-for="row in pagedFleets" :key="row.id" class="fleet-card">
        <header class="fleet-meta">
          <div class="fleet-id">
            <span class="meta-label">{{ t('fleets.fleet') }}</span>
            <strong>#{{ row.id }}</strong>
          </div>
          <label class="meta-field">
            <span class="meta-label">{{ t('fleets.faction') }}</span>
            <el-select
              size="small"
              filterable
              :model-value="row.faction"
              @visible-change="(open: boolean) => onSelectVisible('fac-' + row.id, open)"
              @update:model-value="(v) => setFaction(row.id, v ?? undefined)"
            >
              <el-option
                v-for="o in visibleOptions('fac-' + row.id, row.faction, 'faction')"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </label>
          <label class="meta-field">
            <span class="meta-label">{{ t('fleets.commander') }}</span>
            <el-select
              size="small"
              filterable
              :model-value="row.commander"
              @visible-change="(open: boolean) => onSelectVisible('c-' + row.id, open)"
              @update:model-value="(v) => setCommander(row.id, v)"
            >
              <el-option
                v-for="o in visibleOptions('c-' + row.id, row.commander, 'commander')"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </label>
          <label class="meta-field">
            <span class="meta-label">{{ t('fleets.flagship') }}</span>
            <el-select
              v-if="row.flagshipType !== null"
              size="small"
              filterable
              :model-value="row.flagshipType"
              @visible-change="(open: boolean) => onSelectVisible('f-' + row.id, open)"
              @update:model-value="(v) => setFlagshipType(row.id, v)"
            >
              <el-option
                v-for="o in visibleOptions('f-' + row.id, row.flagshipType, 'unit')"
                :key="'f' + o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
            <span v-else class="empty">{{ t('fleets.empty') }}</span>
          </label>
        </header>

        <div class="units-section">
          <div class="units-title">{{ t('fleets.units') }}</div>
          <p v-if="row.units.length === 0" class="empty">{{ t('fleets.empty') }}</p>
          <div v-else class="unit-grid">
            <div v-for="u in row.units" :key="u.slot" class="unit-block">
              <div class="unit-head">
                <span class="slot">{{ t('fleets.slot', u.slot) }}</span>
                <el-select
                  size="small"
                  filterable
                  class="unit-type"
                  :model-value="u.typeId"
                  @visible-change="(open: boolean) => onSelectVisible('u-' + u.fleetId + '-' + u.slot, open)"
                  @update:model-value="(v) => setUnitField(u.fleetId, u.slot, 0, v ?? undefined)"
                >
                  <el-option
                    v-for="o in visibleOptions('u-' + u.fleetId + '-' + u.slot, u.typeId, 'unit')"
                    :key="o.value"
                    :label="o.label"
                    :value="o.value"
                  />
                </el-select>
              </div>
              <div class="unit-stats">
                <label
                  v-for="(field, fi) in u.fields.slice(1)"
                  :key="Number(fi) + 1"
                  class="stat"
                >
                  <span class="stat-label">{{ tupleFieldLabel(Number(fi) + 1) }}</span>
                  <el-input-number
                    size="small"
                    class="stat-input"
                    :model-value="field"
                    :min="0"
                    :max="TUPLE_MAX"
                    controls-position="right"
                    @update:model-value="(v) => setUnitField(u.fleetId, u.slot, Number(fi) + 1, v ?? undefined)"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="placeholder" aria-hidden="true" />

    <div v-if="ready && fleetCount > PAGE_SIZE" class="pager">
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next"
        :page-size="PAGE_SIZE"
        :total="fleetCount"
        :pager-count="5"
        small
        background
      />
      <span class="page-hint">{{ t('fleets.page', page, pageCount) }}</span>
    </div>
  </div>
</template>

<style scoped>
.panel { min-height: 240px; }
.warn { margin-bottom: 12px; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 12px; }
.count { color: #909399; font-size: 13px; }
.empty { color: #909399; margin: 0; }

.fleet-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 560px;
  overflow: auto;
  padding-right: 2px;
}

.fleet-card {
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  background: var(--el-bg-color, #fff);
  padding: 12px 14px;
}

.fleet-meta {
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  align-items: end;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.fleet-id,
.meta-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin: 0;
}

.meta-label {
  color: #909399;
  font-size: 12px;
  line-height: 1.2;
}

.fleet-id strong {
  font-size: 15px;
  line-height: 32px;
}

.meta-field :deep(.el-select) {
  width: 100%;
}

.units-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.unit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.unit-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  background: var(--el-fill-color-blank, #fff);
}

.unit-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.slot {
  flex: 0 0 auto;
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
}

.unit-type { flex: 1 1 auto; min-width: 0; width: 100%; }

.unit-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  margin: 0;
}

.stat-label {
  color: #606266;
  font-size: 12px;
  line-height: 1.2;
}

.stat-input { width: 100%; }
.stat-input :deep(.el-input-number) { width: 100%; }
.stat-input :deep(.el-input__wrapper) { width: 100%; }

.placeholder { min-height: 200px; }
.pager { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
.page-hint { color: #909399; font-size: 12px; }

@media (max-width: 900px) {
  .fleet-meta {
    grid-template-columns: 1fr 1fr;
  }
  .fleet-id {
    grid-column: 1 / -1;
  }
}
</style>
