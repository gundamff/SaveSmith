<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '@host/i18n'
import { runeDisplayName } from '../model/runes'
import { projectUser, setRune } from '../model/userModel'
import { useDcEditor } from './inject'

const editor = useDcEditor()
const rows = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc).runes.map((r) => ({
    id: r.id,
    name: runeDisplayName(r.id, locale.value),
    enabled: r.enabled
  }))
})
const editable = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc).editable
})

function toggle(id: string, v: boolean | string | number): void {
  editor.markDirty(() => setRune(editor.save.doc, id, v === true))
}

function toggleAll(on: boolean): void {
  editor.markDirty(() => {
    for (const r of projectUser(editor.save.doc).runes) {
      setRune(editor.save.doc, r.id, on)
    }
  })
}
</script>

<template>
  <div class="dc-runes" :data-ss-rev="editor.rev">
    <p v-if="!editable" class="dc-empty">{{ t('dc.runes.unreadable') }}</p>
    <template v-else>
      <div class="toolbar">
        <el-button type="primary" @click="toggleAll(true)">{{ t('dc.runes.unlockAll') }}</el-button>
        <el-button @click="toggleAll(false)">{{ t('dc.runes.clearAll') }}</el-button>
      </div>
      <p class="hint">{{ t('dc.runes.hint') }}</p>
      <el-table :data="rows" size="small" style="width: 100%" row-key="id">
        <el-table-column :label="t('dc.runes.name')" min-width="220">
          <template #default="{ row }">
            <div class="name-cell">
              <span>{{ row.name }}</span>
              <span class="raw-id">{{ row.id }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('dc.runes.unlocked')" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
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
