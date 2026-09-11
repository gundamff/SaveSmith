<script setup lang="ts">
import { computed, ref } from 'vue'
import { locale, t } from '@host/i18n'
import { getItemRow, searchItems } from '../model/itemCatalog'
import { useTeEditor } from './inject'

const editor = useTeEditor()
const pickerOpen = ref(false)
const pickerQuery = ref('')
const editing = ref<{ kind: 'inv' | 'armor'; index: number } | null>(null)

function itemLabel(id: number): string {
  const row = getItemRow(id)
  if (!row) return id === 0 ? t('te.item.empty') : `#${id}`
  if (id === 0) return t('te.item.empty')
  return locale.value === 'en' ? row.name.en : row.name.zh
}

const filteredItems = computed(() => searchItems(pickerQuery.value, 100))

function openPicker(kind: 'inv' | 'armor', index: number) {
  editing.value = { kind, index }
  pickerQuery.value = ''
  pickerOpen.value = true
}

function clearSlot() {
  if (!editing.value) return
  applyItem(0)
}

function pickCatalog(id: number) {
  applyItem(id)
}

function applyItem(id: number) {
  const target = editing.value
  if (!target) return
  editor.markDirty(() => {
    if (target.kind === 'armor') {
      const slot = editor.save.armor[target.index]
      if (!slot) return
      if (id === 0) {
        slot.id = 0
        slot.prefix = 0
        slot.flag = 0
      } else {
        if (slot.id !== id) slot.prefix = 0
        slot.id = id
        slot.flag = 0
      }
    } else {
      const slot = editor.save.inventory[target.index]
      if (!slot) return
      if (id === 0) {
        slot.id = 0
        slot.stack = 0
        slot.prefix = 0
        slot.favorited = false
      } else {
        const prevStack = slot.stack
        if (slot.id !== id) slot.prefix = 0
        slot.id = id
        slot.stack = prevStack > 0 ? prevStack : 1
      }
    }
  })
  pickerOpen.value = false
}

function setStack(index: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const slot = editor.save.inventory[index]
    if (!slot || slot.id === 0) return
    slot.stack = Math.max(1, Math.floor(v))
  })
}

const hotbar = computed(() => editor.save.inventory.slice(0, 10))
const mainInv = computed(() => editor.save.inventory.slice(10, 50))
</script>

<template>
  <div class="te-inv">
    <p class="te-hint">{{ t('te.inventory.hint') }}</p>
    <div class="te-row te-head" aria-hidden="true">
      <span>{{ t('te.inventory.colItem') }}</span>
      <span>{{ t('te.inventory.colStack') }}</span>
    </div>

    <section>
      <h3>{{ t('te.inventory.hotbar') }}</h3>
      <div v-for="(slot, i) in hotbar" :key="'h' + i" class="te-row">
        <button type="button" class="te-name" @click="openPicker('inv', i)">
          {{ itemLabel(slot.id) }}
        </button>
        <el-input-number
          :model-value="slot.stack"
          :min="0"
          size="small"
          :disabled="slot.id === 0"
          :title="t('te.inventory.colStack')"
          @update:model-value="(v) => setStack(i, v ?? undefined)"
        />
      </div>
    </section>

    <section>
      <h3>{{ t('te.inventory.main') }}</h3>
      <div v-for="(slot, i) in mainInv" :key="'m' + i" class="te-row">
        <button type="button" class="te-name" @click="openPicker('inv', i + 10)">
          {{ itemLabel(slot.id) }}
        </button>
        <el-input-number
          :model-value="slot.stack"
          :min="0"
          size="small"
          :disabled="slot.id === 0"
          :title="t('te.inventory.colStack')"
          @update:model-value="(v) => setStack(i + 10, v ?? undefined)"
        />
      </div>
    </section>

    <section>
      <h3>{{ t('te.inventory.armor') }}</h3>
      <div v-for="(slot, i) in editor.save.armor" :key="'a' + i" class="te-row te-armor">
        <button type="button" class="te-name" @click="openPicker('armor', i)">
          {{ itemLabel(slot.id) }}
        </button>
      </div>
    </section>
  </div>

  <el-dialog v-model="pickerOpen" :title="t('te.inventory.picker')" width="420px">
    <p class="te-picker-hint">{{ t('te.inventory.pickerHint') }}</p>
    <el-input v-model="pickerQuery" :placeholder="t('te.inventory.search')" clearable />
    <div class="te-picker-list">
      <button type="button" class="te-picker-item" @click="clearSlot">{{ t('te.item.empty') }}</button>
      <button
        v-for="row in filteredItems"
        :key="row.id"
        type="button"
        class="te-picker-item"
        @click="pickCatalog(row.id)"
      >
        <span>{{ locale === 'en' ? row.name.en : row.name.zh }}</span>
        <span class="te-muted">#{{ row.id }}</span>
      </button>
    </div>
  </el-dialog>
</template>

<style scoped>
.te-inv section {
  margin-bottom: 20px;
}
.te-inv h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.te-hint {
  opacity: 0.75;
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.45;
}
.te-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 120px;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.te-armor {
  grid-template-columns: 1fr;
}
.te-head {
  margin-bottom: 10px;
  font-size: 12px;
  opacity: 0.65;
  font-weight: 600;
}
.te-name {
  text-align: left;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.te-muted {
  opacity: 0.55;
  text-align: center;
}
.te-picker-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.75;
}
.te-picker-list {
  margin-top: 12px;
  max-height: 320px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.te-picker-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  border: none;
  background: transparent;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.te-picker-item:hover {
  background: var(--el-fill-color-light);
}
</style>
