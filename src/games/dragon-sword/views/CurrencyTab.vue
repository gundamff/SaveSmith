<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { MAX_CURRENCY_AMOUNT, maxCurrency } from '../actions'
import { catalogLabel } from '../catalog'
import { t } from '../i18n'
import { useDsEditor } from './inject'

interface CurrencySnapshot {
  index: number
  itemCid: number
  amount: number
}

const editor = useDsEditor()
const rows = computed((): CurrencySnapshot[] => {
  void editor.rev
  return editor.save.currencies.map((row, index) => ({
    index,
    itemCid: row.itemCid,
    amount: row.amount
  }))
})

function changeAmount(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.currencies[index]
    if (!row) return
    row.amount = Math.max(0, Math.floor(v))
  })
}

function maxAll(): void {
  editor.markDirty(() => maxCurrency(editor.save))
  ElMessage.success(t('currency.maxed'))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('currency.maxAll') }}</el-button>
    </div>
    <p v-if="rows.length === 0" class="ds-empty">{{ t('currency.empty') }}</p>
    <el-table v-else :data="rows" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('currency.cid')" min-width="140">
        <template #default="{ row }">{{ catalogLabel(row.itemCid) }}</template>
      </el-table-column>
      <el-table-column :label="t('currency.amount')" width="220">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.amount"
            :min="0"
            :max="MAX_CURRENCY_AMOUNT"
            controls-position="right"
            @update:model-value="(v) => changeAmount(row.index, v ?? undefined)"
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
.ds-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
