<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '@host/i18n'
import {
  hmsToTotalSeconds,
  isValidDurationSeconds,
  totalSecondsToHms
} from '../model/durationFormat'
import {
  isEditableSlotName,
  projectProgress,
  setGameTimeSeconds
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

const progress = computed(() => {
  void editor.rev
  return selectedSlot.value ? projectProgress(selectedSlot.value) : null
})

const gameTimeHms = computed(() => {
  void editor.rev
  const seconds = progress.value?.gameTimeSeconds
  if (seconds === undefined || !isValidDurationSeconds(seconds)) {
    return { hours: 0, minutes: 0, seconds: 0 }
  }
  return totalSecondsToHms(seconds)
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

function changeGameTimePart(part: 'hours' | 'minutes' | 'seconds', value: number | undefined): void {
  if (value === undefined || Number.isNaN(value)) return
  const current = gameTimeHms.value
  const next = { ...current, [part]: value }
  try {
    const total = hmsToTotalSeconds(next)
    editor.markDirty(() =>
      setGameTimeSeconds(editor.save.model, selectedSlotName.value, total)
    )
  } catch {
    // ignore invalid partial HMS until complete
  }
}
</script>

<template>
  <div class="pbz-progress" :data-ss-rev="editor.rev">
    <el-alert
      class="pbz-warning"
      type="warning"
      :closable="false"
      show-icon
      :title="t('pbz.resources.warning')"
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

      <template v-if="progress?.hasGameSystem">
        <el-form-item :label="t('pbz.progress.cycleDisplay')">
          <el-input-number
            :model-value="Number.isNaN(progress.cycleDisplay) ? undefined : progress.cycleDisplay"
            :min="1"
            :max="100"
            :step="1"
            disabled
          />
        </el-form-item>
        <p class="pbz-hint">{{ t('pbz.progress.cycleHint') }}</p>

        <el-alert
          v-if="progress.timesMismatch"
          class="pbz-warning"
          type="warning"
          :closable="false"
          show-icon
          :title="t('pbz.progress.timesMismatch')"
        />

        <el-form-item :label="t('pbz.progress.gameTime')">
          <div class="pbz-hms">
            <el-input-number
              :model-value="gameTimeHms.hours"
              :min="0"
              :max="999"
              :step="1"
              :disabled="!progress.gameTimeEditable"
              @update:model-value="(value) => changeGameTimePart('hours', value ?? undefined)"
            />
            <span class="pbz-hms__label">{{ t('pbz.progress.hours') }}</span>
            <el-input-number
              :model-value="gameTimeHms.minutes"
              :min="0"
              :max="59"
              :step="1"
              :disabled="!progress.gameTimeEditable"
              @update:model-value="(value) => changeGameTimePart('minutes', value ?? undefined)"
            />
            <span class="pbz-hms__label">{{ t('pbz.progress.minutes') }}</span>
            <el-input-number
              :model-value="gameTimeHms.seconds"
              :min="0"
              :max="59"
              :step="1"
              :disabled="!progress.gameTimeEditable"
              @update:model-value="(value) => changeGameTimePart('seconds', value ?? undefined)"
            />
            <span class="pbz-hms__label">{{ t('pbz.progress.seconds') }}</span>
          </div>
        </el-form-item>
        <p v-if="!progress.gameTimeEditable" class="pbz-hint">
          {{ t('pbz.progress.gameTimeDisabled') }}
        </p>

        <p class="pbz-hint">
          {{ t('pbz.progress.cycleRecordsReadonly', progress.cycleRecordCount) }}
        </p>
      </template>
    </el-form>

    <p v-if="selectedSlot && progress && !progress.hasGameSystem" class="pbz-empty">
      {{ t('pbz.progress.empty') }}
    </p>
  </div>
</template>

<style scoped>
.pbz-progress {
  display: grid;
  gap: 16px;
}

.pbz-warning {
  white-space: normal;
}

.pbz-form {
  max-width: 640px;
}

.pbz-hint {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.pbz-hms {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pbz-hms__label {
  margin-right: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.pbz-empty {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
