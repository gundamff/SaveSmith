<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ModuleError } from '@sdk/error'
import { locale, t, translateError } from '@host/i18n'
import { getPbzBossDifficulty, listPbzBossDifficulties, pbzBossDifficultyName } from '../catalog/bossDifficulties'
import { getBossDisplayName } from '../catalog/bosses'
import {
  hmsToTotalSeconds,
  isValidDurationSeconds,
  totalSecondsToHms
} from '../model/durationFormat'
import {
  isEditableSlotName,
  projectBossRecords,
  projectDeathMeta,
  setBossBestTimeSeconds,
  setBossDeathCount,
  setBossDifficultyKey,
  setDiedTimes
} from '../model/saveModel'
import { usePbzEditor } from './inject'
import {
  reconcileSlotSelection,
  requestSlotSelection
} from './slotSelection'

const editor = usePbzEditor()
const selectedSlotName = ref(editor.save.model.selectedSlotName ?? '')
const catalogDifficulties = listPbzBossDifficulties()

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

function difficultyLabel(key: string): string {
  const language = locale.value === 'en' ? 'en' : 'zh'
  return pbzBossDifficultyName(key, language)
}

function difficultyOptionsForRow(difficultyKey: string) {
  if (getPbzBossDifficulty(difficultyKey)) return catalogDifficulties
  return [
    { key: difficultyKey, zh: difficultyKey, en: difficultyKey, order: -1 },
    ...catalogDifficulties
  ]
}

function changeBossDifficulty(bossId: string, fromKey: string, toKey: string | null): void {
  if (!toKey || toKey === fromKey) return
  try {
    editor.markDirty(() =>
      setBossDifficultyKey(editor.save.model, selectedSlotName.value, bossId, fromKey, toKey)
    )
  } catch (e) {
    window.alert(translateError(e instanceof ModuleError ? e : e))
  }
}

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

function bossBestTimeSeconds(bestTimeMs: number | null): number | null {
  if (bestTimeMs == null) return null
  const seconds = Math.round(bestTimeMs / 1000)
  return isValidDurationSeconds(seconds) ? seconds : null
}

function bossBestTimeHms(bestTimeMs: number | null): { hours: number; minutes: number; seconds: number } {
  const seconds = bossBestTimeSeconds(bestTimeMs)
  if (seconds === null) return { hours: 0, minutes: 0, seconds: 0 }
  return totalSecondsToHms(seconds)
}

function changeBossBestTimePart(
  bossId: string,
  difficultyKey: string,
  bestTimeMs: number | null,
  part: 'hours' | 'minutes' | 'seconds',
  value: number | undefined
): void {
  if (value === undefined || Number.isNaN(value)) return
  const current = bossBestTimeHms(bestTimeMs)
  const next = { ...current, [part]: value }
  try {
    const total = hmsToTotalSeconds(next)
    editor.markDirty(() =>
      setBossBestTimeSeconds(
        editor.save.model,
        selectedSlotName.value,
        bossId,
        difficultyKey,
        total
      )
    )
  } catch {
    // ignore invalid partial HMS until complete
  }
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
    <el-alert
      class="pbz-warning"
      type="warning"
      :closable="false"
      show-icon
      :title="t('pbz.records.difficultyRisk')"
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
      <el-table-column :label="t('pbz.records.difficulty')" min-width="140">
        <template #default="{ row }">
          <el-select
            :model-value="row.difficultyKey"
            @update:model-value="(value) => changeBossDifficulty(row.bossId, row.difficultyKey, value)"
          >
            <el-option
              v-for="opt in difficultyOptionsForRow(row.difficultyKey)"
              :key="opt.key"
              :label="difficultyLabel(opt.key)"
              :value="opt.key"
            />
          </el-select>
        </template>
      </el-table-column>
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
      <el-table-column :label="t('pbz.records.bestTime')" min-width="280">
        <template #default="{ row }">
          <span v-if="bossBestTimeSeconds(row.bestTimeMs) === null">
            {{ t('pbz.records.bestTimeMissing') }}
          </span>
          <div v-else class="pbz-hms">
            <el-input-number
              :model-value="bossBestTimeHms(row.bestTimeMs).hours"
              :min="0"
              :max="999"
              :step="1"
              @update:model-value="(value) => changeBossBestTimePart(row.bossId, row.difficultyKey, row.bestTimeMs, 'hours', value ?? undefined)"
            />
            <span class="pbz-hms__label">{{ t('pbz.progress.hours') }}</span>
            <el-input-number
              :model-value="bossBestTimeHms(row.bestTimeMs).minutes"
              :min="0"
              :max="59"
              :step="1"
              @update:model-value="(value) => changeBossBestTimePart(row.bossId, row.difficultyKey, row.bestTimeMs, 'minutes', value ?? undefined)"
            />
            <span class="pbz-hms__label">{{ t('pbz.progress.minutes') }}</span>
            <el-input-number
              :model-value="bossBestTimeHms(row.bestTimeMs).seconds"
              :min="0"
              :max="59"
              :step="1"
              @update:model-value="(value) => changeBossBestTimePart(row.bossId, row.difficultyKey, row.bestTimeMs, 'seconds', value ?? undefined)"
            />
            <span class="pbz-hms__label">{{ t('pbz.progress.seconds') }}</span>
          </div>
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

.pbz-hms {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.pbz-hms__label {
  margin-right: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
