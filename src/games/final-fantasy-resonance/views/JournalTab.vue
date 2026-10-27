<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { setColosseumClear, setQuestDeliveryQty, setRequestProgress } from '../model/saveModel'
import { useFfrEditor } from './inject'

const editor = useFfrEditor()

const progressFlagCount = computed(() => {
  void editor.rev
  return editor.save.progressFlagCount
})

const questRows = computed(() => {
  void editor.rev
  return editor.save.quests.flatMap((q) =>
    q.deliveries.map((d) => ({
      questIndex: q.index,
      questId: q.questId,
      requestId: q.requestId,
      deliveryIndex: d.index,
      deliveryId: d.id,
      quantity: d.quantity
    }))
  )
})

const requestRows = computed(() => {
  void editor.rev
  return editor.save.requests.map((r) => ({ ...r }))
})

const coloRows = computed(() => {
  void editor.rev
  return editor.save.colosseum.map((c) => ({ ...c }))
})

const shopRows = computed(() => {
  void editor.rev
  return editor.save.shops.map((s) => ({ ...s }))
})

function onQty(qi: number, di: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setQuestDeliveryQty(editor.save, qi, di, v))
}

function onReq(index: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setRequestProgress(editor.save, index, v))
}

function onColo(index: number, v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setColosseumClear(editor.save, index, v))
}
</script>

<template>
  <div class="ffr-journal" :data-ss-rev="editor.rev">
    <p class="hint">{{ t('ffr.journal.storyReadonly', progressFlagCount) }}</p>

    <h3>{{ t('ffr.journal.quests') }}</h3>
    <el-table :data="questRows" stripe height="220" size="small">
      <el-table-column prop="questId" :label="t('ffr.journal.questId')" width="100" />
      <el-table-column prop="deliveryId" :label="t('ffr.journal.deliveryId')" width="100" />
      <el-table-column :label="t('ffr.journal.quantity')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.quantity"
            :min="0"
            @update:model-value="(v) => onQty(row.questIndex, row.deliveryIndex, v)"
          />
        </template>
      </el-table-column>
    </el-table>

    <h3>{{ t('ffr.journal.requests') }}</h3>
    <el-table :data="requestRows" stripe height="180" size="small">
      <el-table-column prop="id" :label="t('ffr.journal.requestId')" width="100" />
      <el-table-column :label="t('ffr.journal.progress')" width="160">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.progressIndex"
            @update:model-value="(v) => onReq(row.index, v)"
          />
        </template>
      </el-table-column>
    </el-table>

    <h3>{{ t('ffr.journal.colosseum') }}</h3>
    <el-table :data="coloRows" stripe height="180" size="small">
      <el-table-column prop="id" :label="t('ffr.journal.coloId')" width="100" />
      <el-table-column :label="t('ffr.journal.clearCount')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.clearCount"
            :min="0"
            @update:model-value="(v) => onColo(row.index, v)"
          />
        </template>
      </el-table-column>
    </el-table>

    <h3>{{ t('ffr.journal.shops') }}</h3>
    <p class="hint">{{ t('ffr.journal.shopsHint') }}</p>
    <el-table :data="shopRows" stripe height="160" size="small">
      <el-table-column prop="shopId" :label="t('ffr.journal.shopId')" width="90" />
      <el-table-column prop="itemId" :label="t('ffr.journal.itemId')" width="90" />
      <el-table-column prop="currentBuyNum" :label="t('ffr.journal.bought')" width="100" />
      <el-table-column prop="maxOrderNum" :label="t('ffr.journal.maxOrder')" width="100" />
    </el-table>
  </div>
</template>

<style scoped>
.ffr-journal h3 {
  margin: 16px 0 8px;
  font-size: 14px;
}
.hint {
  color: var(--el-text-color-secondary);
  margin: 0 0 8px;
}
</style>
