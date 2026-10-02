<script setup lang="ts">
import { computed, ref } from 'vue'
import { locale, t } from '@host/i18n'
import { categoryIds, UNLOCK_CATEGORIES, type UnlockCategory } from '../model/catalog'
import { itemDisplayName } from '../model/itemNames'
import { isItemUnlockedById, projectUser, setItemUnlockedById } from '../model/userModel'
import { useDcEditor } from './inject'

const editor = useDcEditor()
const filter = ref<UnlockCategory>('all')
const search = ref('')

type Row = { id: string; category: string; name: string; unlocked: boolean }

const CATEGORY_OF = new Map<string, string>()
for (const cat of UNLOCK_CATEGORIES) {
  for (const id of categoryIds(cat)) if (!CATEGORY_OF.has(id)) CATEGORY_OF.set(id, cat)
}

const allRows = computed((): Row[] => {
  void editor.rev
  return categoryIds('all').map((id) => ({
    id,
    category: CATEGORY_OF.get(id) ?? 'meta',
    name: itemDisplayName(id, locale.value),
    unlocked: isItemUnlockedById(editor.save.doc, id)
  }))
})

const rows = computed(() => {
  void editor.rev
  const q = search.value.trim().toLowerCase()
  const ids = new Set(filter.value === 'all' ? [] : categoryIds(filter.value))
  return allRows.value.filter(
    (r) =>
      (filter.value === 'all' || ids.has(r.id)) &&
      (q === '' || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
  )
})

const editable = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc).editable
})

function toggle(id: string, v: boolean | string | number): void {
  editor.markDirty(() => setItemUnlockedById(editor.save.doc, id, v === true))
}

function setVisible(on: boolean): void {
  editor.markDirty(() => {
    for (const r of rows.value) setItemUnlockedById(editor.save.doc, r.id, on)
  })
}

function categoryLabel(cat: string): string {
  const key = `dc.unlock.cat.${cat}`
  const text = t(key)
  return text === key ? cat : text
}
</script>

<template>
  <div class="dc-unlock" :data-ss-rev="editor.rev">
    <p v-if="!editable" class="dc-empty">{{ t('dc.unlock.unreadable') }}</p>
    <template v-else>
      <div class="toolbar">
        <el-radio-group v-model="filter">
          <el-radio-button value="all">{{ t('dc.unlock.cat.all') }}</el-radio-button>
          <el-radio-button v-for="c in UNLOCK_CATEGORIES" :key="c" :value="c">
            {{ categoryLabel(c) }}
          </el-radio-button>
        </el-radio-group>
        <el-input
          v-model="search"
          :placeholder="t('dc.unlock.search')"
          clearable
          style="max-width: 200px"
        />
        <el-button type="primary" @click="setVisible(true)">
          {{ t('dc.unlock.unlockVisible') }}
        </el-button>
        <el-button @click="setVisible(false)">{{ t('dc.unlock.clearVisible') }}</el-button>
      </div>
      <p class="hint">{{ t('dc.unlock.hint') }}</p>
      <el-table :data="rows" size="small" style="width: 100%" row-key="id" max-height="520">
        <el-table-column :label="t('dc.unlock.name')" min-width="220">
          <template #default="{ row }">
            <div class="name-cell">
              <span>{{ row.name }}</span>
              <span class="raw-id">{{ row.id }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('dc.unlock.kind')" width="110">
          <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
        </el-table-column>
        <el-table-column :label="t('dc.unlock.unlocked')" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.unlocked"
              @update:model-value="(v: boolean | string | number) => toggle(row.id, v)"
            />
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.hint {
  margin: 0 0 12px;
  font-size: 12px;
  opacity: 0.7;
}
.name-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.raw-id {
  font-size: 11px;
  opacity: 0.45;
}
.dc-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
