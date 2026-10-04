<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@host/i18n'
import { aircraftLabel, CATALOG_AIRCRAFT, matchesQuery } from '../model/catalog'
import { readOwnedAircraftIds, setOwnedAircraft } from '../model/ownedLists'
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
  return catalog.value
    .map((id) => ({ id, name: aircraftLabel(id), on: set.has(id) }))
    .filter((r) => matchesQuery(r.id, r.name, q) && (!onlyMissing.value || !r.on))
})

function toggle(id: number, on: boolean): void {
  editor.markDirty(() => {
    setOwnedAircraft(editor.save.patch, id, on)
    refreshView(editor.save)
  })
}

function setVisible(on: boolean): void {
  editor.markDirty(() => {
    for (const r of rows.value) setOwnedAircraft(editor.save.patch, r.id, on)
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
      <el-table-column prop="id" :label="t('ac8.lists.id')" width="110" />
      <el-table-column prop="name" :label="t('ac8.lists.name')" min-width="220" />
      <el-table-column :label="t('ac8.lists.owned')" width="140">
        <template #default="{ row }">
          <el-switch :model-value="row.on" @change="(v: string | number | boolean) => toggle(row.id, Boolean(v))" />
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
</style>
