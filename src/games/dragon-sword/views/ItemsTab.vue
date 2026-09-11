<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { catalogLabel } from '../catalog'
import { t } from '../i18n'
import { useDsEditor } from './inject'

const MAX_STACK = 99_999_999

interface StackSnapshot {
  index: number
  itemCid: number
  stackCnt: number
}

const editor = useDsEditor()
const addCid = ref(0)
const addStack = ref(1)

const rows = computed((): StackSnapshot[] => {
  void editor.rev
  return editor.save.stackables.map((row, index) => ({
    index,
    itemCid: row.itemCid,
    stackCnt: row.stackCnt
  }))
})

function changeStack(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.stackables[index]
    if (!row) return
    row.stackCnt = Math.max(0, Math.floor(v))
  })
}

function setAddCid(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  addCid.value = Math.floor(v)
}

function setAddStack(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  addStack.value = Math.max(0, Math.floor(v))
}

function addItem(): void {
  const cid = addCid.value
  const stack = addStack.value
  if (!Number.isFinite(cid) || cid <= 0) return
  if (!Number.isFinite(stack) || stack < 0) return
  editor.markDirty(() => {
    const existing = editor.save.stackables.find((r) => r.itemCid === cid)
    if (existing) existing.stackCnt = stack
    else editor.save.stackables.push({ itemCid: cid, stackCnt: stack })
  })
  ElMessage.success(t('items.added'))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <span class="add-label">{{ t('items.addCid') }}</span>
      <el-input-number
        size="small"
        :model-value="addCid"
        :min="1"
        :max="MAX_STACK"
        controls-position="right"
        @update:model-value="(v) => setAddCid(v ?? undefined)"
      />
      <span class="add-label">{{ t('items.addStack') }}</span>
      <el-input-number
        size="small"
        :model-value="addStack"
        :min="0"
        :max="MAX_STACK"
        controls-position="right"
        @update:model-value="(v) => setAddStack(v ?? undefined)"
      />
      <el-button type="primary" :disabled="addCid <= 0" @click="addItem()">{{ t('items.add') }}</el-button>
    </div>
    <p v-if="rows.length === 0" class="ds-empty">{{ t('items.empty') }}</p>
    <el-table v-else :data="rows" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('items.cid')" min-width="140">
        <template #default="{ row }">{{ catalogLabel(row.itemCid) }}</template>
      </el-table-column>
      <el-table-column :label="t('items.stack')" width="220">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.stackCnt"
            :min="0"
            :max="MAX_STACK"
            controls-position="right"
            @update:model-value="(v) => changeStack(row.index, v ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>
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
.add-label {
  opacity: 0.8;
  font-size: 13px;
}
.ds-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
