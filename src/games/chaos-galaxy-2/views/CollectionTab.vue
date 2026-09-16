<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { CollectionName } from '../model/configModel'
import { commanderById, gameData, unitById } from '../model/gameData'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

interface CollectionBitRow {
  index: number
  name: string
  on: boolean
}

const editor = useCg2Editor()
const col = computed(() => {
  void editor.rev
  return editor.config
})

function bitsOf(name: CollectionName): boolean[] {
  void editor.rev
  if (!col.value) return []
  try {
    return col.value.getCollection(name)
  } catch {
    return []
  }
}

const commanderRows = computed((): CollectionBitRow[] => {
  const bits = bitsOf('CommanderCollections')
  return gameData.collectionCommanders
    .filter((e) => e.index < bits.length)
    .map((e) => ({
      index: e.index,
      name: commanderById(gameData, e.commanderId)?.name || t('collection.fallback', e.commanderId),
      on: bits[e.index] === true
    }))
})

const unitRows = computed((): CollectionBitRow[] => {
  const bits = bitsOf('UnitCollections')
  return gameData.collectionUnits
    .filter((e) => e.index < bits.length)
    .map((e) => ({
      index: e.index,
      name: unitById(gameData, e.unitId)?.name || t('collection.fallback', e.unitId),
      on: bits[e.index] === true
    }))
})

const eventRows = computed((): CollectionBitRow[] => {
  const bits = bitsOf('EventCollections')
  return gameData.collectionEvents
    .filter((e) => e.index < bits.length)
    .map((e) => ({
      index: e.index,
      name: e.name || t('collection.fallback', e.index),
      on: bits[e.index] === true
    }))
})

function maxAll(): void {
  if (!col.value) return
  editor.markDirty(() => {
    col.value!.maxAllCollections()
  })
  ElMessage.success(t('collection.maxed'))
}

function setBit(name: CollectionName, index: number, on: string | number | boolean): void {
  const enabled = on === true || on === index
  editor.markDirty(() => {
    col.value!.setCollectionBit(name, index, enabled)
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <template v-if="col">
      <div class="toolbar">
        <el-button type="primary" @click="maxAll()">{{ t('collection.maxAll') }}</el-button>
      </div>
      <el-alert type="info" show-icon :closable="false" :title="t('collection.useHostSave')" class="warn" />
      <h4>{{ t('collection.commanders') }}</h4>
      <el-checkbox-group :model-value="commanderRows.filter((r) => r.on).map((r) => r.index)">
        <el-checkbox
          v-for="row in commanderRows"
          :key="'c' + row.index"
          :value="row.index"
          :label="row.name"
          @change="(on) => setBit('CommanderCollections', row.index, on)"
        />
      </el-checkbox-group>
      <h4>{{ t('collection.units') }}</h4>
      <el-checkbox-group :model-value="unitRows.filter((r) => r.on).map((r) => r.index)">
        <el-checkbox
          v-for="row in unitRows"
          :key="'u' + row.index"
          :value="row.index"
          :label="row.name"
          @change="(on) => setBit('UnitCollections', row.index, on)"
        />
      </el-checkbox-group>
      <h4>{{ t('collection.events') }}</h4>
      <el-checkbox-group :model-value="eventRows.filter((r) => r.on).map((r) => r.index)">
        <el-checkbox
          v-for="row in eventRows"
          :key="'e' + row.index"
          :value="row.index"
          :label="row.name"
          @change="(on) => setBit('EventCollections', row.index, on)"
        />
      </el-checkbox-group>
    </template>
    <el-alert v-else type="warning" show-icon :closable="false" :title="t('collection.missing')" />
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
.warn { margin-bottom: 12px; max-width: 640px; }
h4 { margin: 16px 0 8px; }
</style>
