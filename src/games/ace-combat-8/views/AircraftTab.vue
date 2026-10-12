<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@host/i18n'
import {
  aircraftInfo,
  aircraftLabel,
  CATALOG_AIRCRAFT,
  matchesQuery,
  weaponShortLabel
} from '../model/catalog'
import {
  readOwnedAircraftIds,
  readOwnedWeapons,
  setOwnedAircraft,
  setOwnedWeapon
} from '../model/ownedLists'
import { refreshView } from '../parse'
import { useAc8Editor } from './inject'

const editor = useAc8Editor()
const search = ref('')
const onlyMissing = ref(false)

const owned = computed(() => {
  void editor.rev
  return new Set(readOwnedAircraftIds(editor.save.patch.bytes))
})

const catalog = computed(() => {
  void editor.rev
  const ids = new Set<number>([...CATALOG_AIRCRAFT.map((x) => x.id), ...owned.value])
  return [...ids].sort((a, b) => a - b)
})

const rows = computed(() => {
  void editor.rev
  const q = search.value
  const set = owned.value
  const bytes = editor.save.patch.bytes
  return catalog.value
    .map((id) => {
      const info = aircraftInfo(id)
      const weapons = info?.spWeapons ?? []
      const ownedSp = new Set(set.has(id) ? readOwnedWeapons(bytes, id) : [])
      return {
        id,
        name: aircraftLabel(id),
        on: set.has(id),
        missionOnly: Boolean(info?.missionOnly),
        weapons: weapons.map((wid, i) => ({
          wid,
          slot: i + 1,
          label: `SP${i + 1} ${weaponShortLabel(wid)}`,
          on: ownedSp.has(wid)
        }))
      }
    })
    .filter((r) => matchesQuery(r.id, r.name, q) && (!onlyMissing.value || !r.on))
})

function toggle(id: number, on: boolean): void {
  editor.markDirty(() => {
    setOwnedAircraft(editor.save.patch, id, on, false)
    refreshView(editor.save)
  })
}

function toggleWeapon(planeId: number, weaponId: string, on: boolean): void {
  editor.markDirty(() => {
    setOwnedWeapon(editor.save.patch, planeId, weaponId, on)
    refreshView(editor.save)
  })
}

/** Align with ac8-save-editor v1.0.2: check-all unlocks all SP; skip mission loaners. */
function setVisible(on: boolean): void {
  editor.markDirty(() => {
    for (const r of rows.value) {
      if (on && r.missionOnly) continue
      setOwnedAircraft(editor.save.patch, r.id, on, on)
    }
    refreshView(editor.save)
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p class="hint">{{ t('ac8.lists.aircraftHint') }}</p>
    <div class="toolbar">
      <el-input v-model="search" :placeholder="t('ac8.lists.searchName')" clearable style="max-width: 260px" />
      <el-checkbox v-model="onlyMissing">{{ t('ac8.lists.onlyLocked') }}</el-checkbox>
      <el-button type="primary" @click="setVisible(true)">{{ t('ac8.lists.unlockVisible') }}</el-button>
      <el-button @click="setVisible(false)">{{ t('ac8.lists.lockVisible') }}</el-button>
      <span class="meta">{{ owned.size }} / {{ catalog.length }}</span>
    </div>
    <el-table :data="rows" height="520" stripe>
      <el-table-column prop="id" :label="t('ac8.lists.id')" width="100" />
      <el-table-column prop="name" :label="t('ac8.lists.name')" min-width="180" />
      <el-table-column :label="t('ac8.lists.owned')" width="100">
        <template #default="{ row }">
          <el-switch :model-value="row.on" @change="(v: string | number | boolean) => toggle(row.id, Boolean(v))" />
        </template>
      </el-table-column>
      <el-table-column :label="t('ac8.lists.spWeapons')" min-width="280">
        <template #default="{ row }">
          <div v-if="row.missionOnly" class="loaner">{{ t('ac8.lists.missionOnly') }}</div>
          <div v-else class="sp-row">
            <el-checkbox
              v-for="w in row.weapons"
              :key="w.wid"
              :model-value="w.on"
              :disabled="!row.on"
              @change="(v: string | number | boolean) => toggleWeapon(row.id, w.wid, Boolean(v))"
            >
              {{ w.label }}
            </el-checkbox>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.hint {
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.meta {
  color: var(--el-text-color-secondary);
}
.sp-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.loaner {
  color: var(--el-color-danger);
  font-size: 12px;
}
</style>
