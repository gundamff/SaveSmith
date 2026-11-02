<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { locale, t } from '@host/i18n'
import { getBossDisplayName } from '../catalog/bosses'
import {
  isEditableSlotName,
  projectBossRecords,
  projectDeathMeta,
  setBossDeathCount,
  setDiedTimes
} from '../model/saveModel'
import { usePbzEditor } from './inject'
import {
  reconcileSlotSelection,
  requestSlotSelection
} from './slotSelection'

const editor = usePbzEditor()
const selectedSlotName = ref(editor.save.model.selectedSlotName ?? '')

watch(
  () => editor.rev,
  () => {
    selectedSlotName.value = reconcileSlotSelection(
      editor.save.model,
      selectedSlotName.value
    )
  },
  { flush: 'sync' }
)

const editableSlots = computed(() => {
  void editor.rev
  return editor.save.model.slots.filter(({ name }) => isEditableSlotName(name))
})

const selectedSlot = computed(() => {
  void editor.rev
  return editor.save.model.slots.find(({ name }) => name === selectedSlotName.value) ?? null
})

const deathMeta = computed(() => {
  void editor.rev
  return selectedSlot.value ? projectDeathMeta(selectedSlot.value) : null
})

const bossRows = computed(() => {
  void editor.rev
  void locale.value
  if (!selectedSlot.value) return []
  const language = locale.value === 'en' ? 'en' : 'zh'
  return projectBossRecords(selectedSlot.value).map((row) => ({
    ...row,
    displayName: getBossDisplayName(row.bossId, language)
  }))
})

function changeSlot(targetSlotName: string): void {
  if (
    requestSlotSelection(
      editor.save.model,
      targetSlotName,
      (message) => window.confirm(message),
      t('pbz.resources.slotDirty')
    )
  ) {
    selectedSlotName.value = targetSlotName
  }
}

function changeDiedTimes(value: number | undefined): void {
  if (value === undefined || Number.isNaN(value)) return
  editor.markDirty(() => setDiedTimes(editor.save.model, selectedSlotName.value, value))
}

function changeBossDeath(
  bossId: string,
  difficultyKey: string,
  value: number | undefined
): void {
  if (value === undefined || Number.isNaN(value)) return
  editor.markDirty(() =>
    setBossDeathCount(editor.save.model, selectedSlotName.value, bossId, difficultyKey, value)
  )
}
</script>

<template>
  <div class="pbz-records" :data-ss-rev="editor.rev">
    <el-alert
      class="pbz-warning"
      type="warning"
      :closable="false"
      show-icon
      :title="t('pbz.resources.warning')"
    />
    <el-alert
      class="pbz-warning"
      type="info"
      :closable="false"
      show-icon
      :title="t('pbz.records.heyboxHint')"
    />

    <el-form label-width="140px" class="pbz-form">
      <el-form-item :label="t('pbz.resources.slot')">
        <el-select
          :model-value="selectedSlotName"
          @update:model-value="changeSlot"
        >
          <el-option
            v-for="slot in editableSlots"
            :key="slot.name"
            :label="slot.name"
            :value="slot.name"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="deathMeta" :label="t('pbz.records.diedTimes')">
        <el-input-number
          :model-value="Number.isNaN(deathMeta.diedTimes) ? undefined : deathMeta.diedTimes"
          :min="0"
          :max="99999999"
          :step="1"
          :disabled="Number.isNaN(deathMeta.diedTimes)"
          @update:model-value="(value) => changeDiedTimes(value ?? undefined)"
        />
      </el-form-item>
    </el-form>

    <el-table v-if="selectedSlot" :data="bossRows" empty-text=" ">
      <el-table-column :label="t('pbz.records.bossName')" min-width="160">
        <template #default="{ row }">{{ row.displayName }}</template>
      </el-table-column>
      <el-table-column prop="bossId" :label="t('pbz.records.bossId')" min-width="200" />
      <el-table-column prop="difficultyKey" :label="t('pbz.records.difficulty')" width="100" />
      <el-table-column :label="t('pbz.records.deathCount')" width="160">
        <template #default="{ row }">
          <el-input-number
            :model-value="row.deathCount"
            :min="0"
            :max="99999999"
            :step="1"
            @update:model-value="(value) => changeBossDeath(row.bossId, row.difficultyKey, value ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('pbz.records.defeated')" width="100">
        <template #default="{ row }">
          {{ row.defeated ? t('pbz.records.yes') : t('pbz.records.no') }}
        </template>
      </el-table-column>
    </el-table>
    <p v-if="selectedSlot && bossRows.length === 0" class="pbz-empty">
      {{ t('pbz.records.empty') }}
    </p>
  </div>
</template>

<style scoped>
.pbz-records {
  display: grid;
  gap: 16px;
}

.pbz-warning {
  white-space: normal;
}

.pbz-form {
  max-width: 520px;
}

.pbz-empty {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
