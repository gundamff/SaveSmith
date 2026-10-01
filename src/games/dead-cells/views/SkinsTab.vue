<script setup lang="ts">
import { computed, ref } from 'vue'
import { locale, t } from '@host/i18n'
import { itemDisplayName } from '../model/itemNames'
import { skinCatalog, type SkinKind } from '../model/skins'
import { isSkinUnlocked, projectUser, setSkinUnlocked } from '../model/userModel'
import { useDcEditor } from './inject'

const editor = useDcEditor()
const filter = ref<'all' | SkinKind>('all')
const search = ref('')

type Row = { id: string; kind: SkinKind; name: string; unlocked: boolean }

const allRows = computed((): Row[] => {
  void editor.rev
  return skinCatalog().map((e) => ({
    id: e.id,
    kind: e.kind,
    name: itemDisplayName(e.id, locale.value),
    unlocked: isSkinUnlocked(editor.save.doc, e.id)
  }))
})

const rows = computed(() => {
  void editor.rev
  const q = search.value.trim().toLowerCase()
  return allRows.value.filter(
    (r) =>
      (filter.value === 'all' || r.kind === filter.value) &&
      (q === '' || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
  )
})

const editable = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc).editable
})

function toggle(id: string, v: boolean | string | number): void {
  editor.markDirty(() => setSkinUnlocked(editor.save.doc, id, v === true))
}

function setVisible(on: boolean): void {
  editor.markDirty(() => {
    for (const r of rows.value) setSkinUnlocked(editor.save.doc, r.id, on)
  })
}

function kindLabel(kind: SkinKind): string {
  return t(kind === 'outfit' ? 'dc.skins.outfit' : 'dc.skins.head')
}
</script>

<template>
  <div class="dc-skins" :data-ss-rev="editor.rev">
    <p v-if="!editable" class="dc-empty">{{ t('dc.skins.unreadable') }}</p>
    <template v-else>
      <div class="toolbar">
        <el-radio-group v-model="filter">
          <el-radio-button value="all">{{ t('dc.skins.all') }}</el-radio-button>
          <el-radio-button value="outfit">{{ t('dc.skins.outfit') }}</el-radio-button>
          <el-radio-button value="head">{{ t('dc.skins.head') }}</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="search"
          :placeholder="t('dc.skins.search')"
          clearable
          style="max-width: 220px"
        />
        <el-button type="primary" @click="setVisible(true)">{{ t('dc.skins.unlockVisible') }}</el-button>
        <el-button @click="setVisible(false)">{{ t('dc.skins.clearVisible') }}</el-button>
      </div>
      <p class="hint">{{ t('dc.skins.hint') }}</p>
      <el-table :data="rows" size="small" style="width: 100%" row-key="id" max-height="520">
        <el-table-column :label="t('dc.skins.name')" min-width="220">
          <template #default="{ row }">
            <div class="name-cell">
              <span>{{ row.name }}</span>
              <span class="raw-id">{{ row.id }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('dc.skins.kind')" width="110">
          <template #default="{ row }">{{ kindLabel(row.kind) }}</template>
        </el-table-column>
        <el-table-column :label="t('dc.skins.unlocked')" width="110">
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
