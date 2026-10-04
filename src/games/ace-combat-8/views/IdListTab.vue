<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@host/i18n'
import {
  CATALOG_EMBLEMS,
  CATALOG_SKINS,
  emblemLabel,
  matchesQuery,
  skinLabel
} from '../model/catalog'
import { findUInt32ArrayProperty, readUInt32Array } from '../model/gvas'
import { setContainsU32 } from '../model/ownedLists'
import { refreshView } from '../parse'
import { useAc8Editor } from './inject'

const props = defineProps<{
  kind: 'skins' | 'emblems'
}>()

const editor = useAc8Editor()
const search = ref('')
const onlyLocked = ref(false)

const catalogItems = computed(() => (props.kind === 'skins' ? CATALOG_SKINS : CATALOG_EMBLEMS))
const listName = computed(() =>
  props.kind === 'skins' ? 'UnlockedSkinIdList' : 'UnlockedEmblemIdList'
)
const newlyName = computed(() =>
  props.kind === 'skins' ? 'NewlyUnlockedSkinIdList' : 'NewlyUnlockedEmblemIdList'
)

const unlocked = computed(() => {
  void editor.rev
  const field = findUInt32ArrayProperty(editor.save.patch.bytes, listName.value)
  return new Set(field ? readUInt32Array(editor.save.patch.bytes, field) : [])
})

const rows = computed(() => {
  void editor.rev
  const q = search.value
  const set = unlocked.value
  const label = props.kind === 'skins' ? skinLabel : emblemLabel
  const ids = new Set<number>([...catalogItems.value.map((x) => x.id), ...set])
  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => ({ id, name: label(id), on: set.has(id) }))
    .filter((r) => matchesQuery(r.id, r.name, q) && (!onlyLocked.value || !r.on))
})

function toggle(id: number, on: boolean): void {
  editor.markDirty(() => {
    setContainsU32(editor.save.patch, listName.value, id, on, newlyName.value)
    refreshView(editor.save)
  })
}

function setVisible(on: boolean): void {
  editor.markDirty(() => {
    for (const r of rows.value) {
      setContainsU32(editor.save.patch, listName.value, r.id, on, newlyName.value)
    }
    refreshView(editor.save)
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p class="hint">{{ t(kind === 'skins' ? 'ac8.lists.skinsHint' : 'ac8.lists.emblemsHint') }}</p>
    <div class="toolbar">
      <el-input v-model="search" :placeholder="t('ac8.lists.searchName')" clearable style="max-width: 260px" />
      <el-checkbox v-model="onlyLocked">{{ t('ac8.lists.onlyLocked') }}</el-checkbox>
      <el-button type="primary" @click="setVisible(true)">{{ t('ac8.lists.unlockVisible') }}</el-button>
      <el-button @click="setVisible(false)">{{ t('ac8.lists.lockVisible') }}</el-button>
      <span class="meta">{{ unlocked.size }} / {{ catalogItems.length }}</span>
    </div>
    <el-table :data="rows" height="520" stripe>
      <el-table-column prop="id" :label="t('ac8.lists.id')" width="110" />
      <el-table-column prop="name" :label="t('ac8.lists.name')" min-width="280" />
      <el-table-column :label="t('ac8.lists.unlocked')" width="120">
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
