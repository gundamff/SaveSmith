<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '@host/i18n'
import {
  isEditableSlotName,
  projectResources,
  setDust
} from '../model/saveModel'
import type { PbzItemCategory } from '../catalog'
import InventoryCategoryTab from './InventoryCategoryTab.vue'
import { usePbzEditor } from './inject'
import {
  reconcileSlotSelection,
  requestSlotSelection
} from './slotSelection'

const editor = usePbzEditor()
const activeCategory = ref<PbzItemCategory>('weapon-material')
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

const resources = computed(() => {
  void editor.rev
  return selectedSlot.value ? projectResources(selectedSlot.value) : null
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

function changeDust(value: number | undefined): void {
  if (value === undefined || Number.isNaN(value)) return
  editor.markDirty(() => setDust(editor.save.model, selectedSlotName.value, value))
}
</script>

<template>
  <div class="pbz-resources" :data-ss-rev="editor.rev">
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

      <el-form-item v-if="resources" :label="t('pbz.resources.dust')">
        <el-input-number
          :model-value="resources.dust"
          :min="0"
          :max="99999999"
          :step="1"
          @update:model-value="(value) => changeDust(value ?? undefined)"
        />
      </el-form-item>
    </el-form>

    <el-tabs v-if="selectedSlot" v-model="activeCategory">
      <el-tab-pane
        :label="t('pbz.resources.weaponMaterials')"
        name="weapon-material"
      >
        <InventoryCategoryTab category="weapon-material" :slot="selectedSlot" />
      </el-tab-pane>
      <el-tab-pane
        :label="t('pbz.resources.consumables')"
        name="consumable"
      >
        <InventoryCategoryTab category="consumable" :slot="selectedSlot" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.pbz-resources {
  display: grid;
  gap: 20px;
}

.pbz-warning {
  white-space: normal;
}

.pbz-form {
  max-width: 520px;
}

</style>
