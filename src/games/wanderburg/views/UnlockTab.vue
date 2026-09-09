<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { locale, t } from '@host/i18n'
import {
  getUnlockedIDs,
  listUnlockCatalog,
  setUnlockId,
  setUnlockedIDsFromCatalog,
  unlockDisplayName
} from '../model/saveModel'
import { useWbEditor } from './inject'

const TYPE_ORDER = ['captain', 'crew', 'module', 'vehicle', 'decoPet'] as const

const TYPE_LABEL_KEY: Record<string, string> = {
  captain: 'wb.unlock.types.captain',
  crew: 'wb.unlock.types.crew',
  module: 'wb.unlock.types.module',
  vehicle: 'wb.unlock.types.vehicle',
  decoPet: 'wb.unlock.types.decoPet'
}

const editor = useWbEditor()
const unlocked = computed(() => new Set(getUnlockedIDs(editor.save.doc)))
const catalog = listUnlockCatalog()

const groups = computed(() => {
  const byType = new Map<string, typeof catalog>()
  for (const e of catalog) {
    const list = byType.get(e.typeName) ?? []
    list.push(e)
    byType.set(e.typeName, list)
  }
  const ordered: { typeName: string; title: string; list: typeof catalog }[] = []
  for (const typeName of TYPE_ORDER) {
    const list = byType.get(typeName)
    if (list?.length) {
      ordered.push({
        typeName,
        title: t(TYPE_LABEL_KEY[typeName] ?? typeName),
        list
      })
      byType.delete(typeName)
    }
  }
  for (const [typeName, list] of byType) {
    ordered.push({ typeName, title: typeName, list })
  }
  return ordered
})

const unlockedInCatalog = computed(
  () => catalog.filter((e) => unlocked.value.has(e.unlockableID)).length
)

function toggle(id: number, on: boolean): void {
  editor.markDirty(() => setUnlockId(editor.save.doc, id, on))
}

function selectAll(on: boolean): void {
  editor.markDirty(() => setUnlockedIDsFromCatalog(editor.save.doc, on))
  ElMessage.success(on ? t('wb.unlock.unlockedAll') : t('wb.unlock.cleared'))
}
</script>

<template>
  <div class="wb-unlock">
    <div class="toolbar">
      <span class="count">{{ t('wb.unlock.progress', unlockedInCatalog, catalog.length) }}</span>
      <el-button type="primary" @click="selectAll(true)">{{ t('wb.unlock.unlockAll') }}</el-button>
      <el-button @click="selectAll(false)">{{ t('wb.unlock.clearAll') }}</el-button>
    </div>

    <div v-for="g in groups" :key="g.typeName" class="group">
      <h4>
        {{ g.title }}（{{ g.list.filter((e) => unlocked.has(e.unlockableID)).length }}/{{
          g.list.length
        }}）
      </h4>
      <el-checkbox-group class="item-row" :model-value="[...unlocked]">
        <el-checkbox
          v-for="e in g.list"
          :key="e.unlockableID"
          :value="e.unlockableID"
          @change="(on: boolean | string | number) => toggle(e.unlockableID, on === true)"
        >
          {{ unlockDisplayName(e, locale) }}
          <span class="price">{{ e.price }}</span>
        </el-checkbox>
      </el-checkbox-group>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.count {
  margin-right: 8px;
  opacity: 0.8;
}
.group {
  margin-bottom: 20px;
}
.group h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.item-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}
.price {
  margin-left: 4px;
  opacity: 0.55;
  font-size: 12px;
}
</style>
