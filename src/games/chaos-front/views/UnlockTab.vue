<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  gameData,
  isUnusedEntry,
  unlockableItems,
  unlockableUnitTypes,
  unitTypeById
} from '../model/gameData'
import { gameImage } from '../lib/images'
import { t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const unlocked = computed(() => {
  void editor.rev
  return new Set(editor.save?.unlockedUnitTypes ?? [])
})
const unlockedItems = computed(() => {
  void editor.rev
  return new Set(editor.save?.unlockedItems ?? [])
})
const unitList = computed(() => unlockableUnitTypes(gameData))
const itemList = computed(() => unlockableItems(gameData))

const groups = computed(() => [
  { title: t('unlock.warships'), list: unitList.value.filter((u) => u.kind === 1) },
  { title: t('unlock.large'), list: unitList.value.filter((u) => u.kind === 2 && u.size === 1) },
  { title: t('unlock.small'), list: unitList.value.filter((u) => u.kind === 2 && u.size === 0) }
])

function toggleType(id: number, on: boolean): void {
  if (on) {
    const u = unitTypeById(gameData, id)
    if (!u || isUnusedEntry(u)) return
  }
  editor.markDirty(() => {
    const arr = editor.save.unlockedUnitTypes
    const i = arr.indexOf(id)
    if (on && i < 0) arr.push(id)
    if (!on && i >= 0) arr.splice(i, 1)
  })
}
function selectAll(on: boolean): void {
  editor.markDirty(() => {
    editor.save.setUnlockedUnitTypes(on ? unitList.value.map((u) => u.id) : [])
  })
  ElMessage.success(on ? t('unlock.unlockedAll') : t('unlock.cleared'))
}
function toggleItem(id: number, on: string | number | boolean): void {
  const enabled = on === true || on === id
  if (enabled) {
    const it = gameData.items.find((x) => x.id === id)
    if (!it || isUnusedEntry(it)) return
  }
  editor.markDirty(() => {
    const arr = editor.save.unlockedItems
    const i = arr.indexOf(id)
    if (enabled && i < 0) arr.push(id)
    if (!enabled && i >= 0) arr.splice(i, 1)
  })
}
function unlockAllItems(): void {
  editor.markDirty(() => editor.save.unlockAllItems(gameData))
  ElMessage.success(t('unlock.itemsUnlocked'))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="selectAll(true)">{{ t('unlock.unlockAllTypes') }}</el-button>
      <el-button @click="selectAll(false)">{{ t('unlock.clearAll') }}</el-button>
      <el-divider direction="vertical" />
      <el-button @click="unlockAllItems()">{{ t('unlock.unlockAllItems') }}</el-button>
    </div>

    <div v-for="g in groups" :key="g.title" class="group">
      <h4>{{ g.title }}（{{ g.list.filter((u) => unlocked.has(u.id)).length }}/{{ g.list.length }}）</h4>
      <div class="grid">
        <div
          v-for="u in g.list"
          :key="u.id"
          class="cell"
          :class="{ on: unlocked.has(u.id) }"
          @click="toggleType(u.id, !unlocked.has(u.id))"
        >
          <img :src="gameImage(`unit-${u.id}`)" />
          <span class="name">{{ u.name }}</span>
        </div>
      </div>
    </div>

    <div class="group">
      <h4>{{ t('unlock.items', unlockedItems.size, itemList.length) }}</h4>
      <el-checkbox-group class="item-row" :model-value="[...unlockedItems]">
        <el-checkbox v-for="it in itemList" :key="it.id" :value="it.id" @change="(on) => toggleItem(it.id, on)">
          {{ it.name }}
        </el-checkbox>
      </el-checkbox-group>
    </div>
  </div>
</template>

<style scoped>
.toolbar { margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.grid { display: flex; flex-wrap: wrap; gap: 8px; }
.cell { width: 88px; padding: 6px; border: 2px solid transparent; border-radius: 6px; text-align: center; cursor: pointer; opacity: 0.45; }
.cell:hover { background: var(--el-fill-color-light); }
.cell.on { opacity: 1; border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.cell img { width: 44px; image-rendering: pixelated; }
.name { display: block; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-row { display: flex; flex-wrap: wrap; gap: 4px 16px; }
</style>
