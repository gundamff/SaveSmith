<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t, translateError } from '@host/i18n'
import {
  isEditableSlotName,
  projectResources,
  setDust
} from '../model/saveModel'
import { deleteNightmareRunSlots } from '../model/deleteNightmareRuns'
import { isNightmareRunSlotName } from '../model/nightmareRunSlots'
import type { PbzItemCategory } from '../catalog'
import type { PbzEquipmentCategory } from '../catalog/equipmentCatalog'
import EquipmentCategoryTab from './EquipmentCategoryTab.vue'
import InventoryCategoryTab from './InventoryCategoryTab.vue'
import { usePbzEditor } from './inject'

type ResourcesTabName = PbzItemCategory | PbzEquipmentCategory
import {
  reconcileSlotSelection,
  requestSlotSelection
} from './slotSelection'

const editor = usePbzEditor()
const activeCategory = ref<ResourcesTabName>('weapon-material')
const selectedSlotName = ref(editor.save.model.selectedSlotName ?? '')
const deletingNightmare = ref(false)

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

const nightmareRunNames = computed(() => {
  void editor.rev
  return editor.save.container.slots
    .map(({ entry }) => entry.name)
    .filter(isNightmareRunSlotName)
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

async function onDeleteNightmareRuns(): Promise<void> {
  if (nightmareRunNames.value.length === 0 || deletingNightmare.value) return
  try {
    await ElMessageBox.confirm(
      t('pbz.resources.deleteNightmareConfirm'),
      t('pbz.resources.deleteNightmareTitle'),
      {
        type: 'warning',
        confirmButtonText: t('pbz.resources.deleteNightmareConfirmButton'),
        cancelButtonText: t('pbz.resources.cancel')
      }
    )
  } catch {
    return
  }

  deletingNightmare.value = true
  try {
    const result = await deleteNightmareRunSlots(editor.save)
    editor.markDirty()
    selectedSlotName.value = reconcileSlotSelection(
      editor.save.model,
      selectedSlotName.value
    )
    ElMessage.success(
      t('pbz.resources.deleteNightmareDone', String(result.deletedRunNames.length))
    )
  } catch (error) {
    ElMessage.error(translateError(error) || t('pbz.resources.deleteNightmareFailed'))
  } finally {
    deletingNightmare.value = false
  }
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

    <section v-if="nightmareRunNames.length > 0" class="pbz-nightmare-delete">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        :title="t('pbz.resources.deleteNightmareHint')"
      />
      <p class="pbz-nightmare-list">
        {{ t('pbz.resources.deleteNightmareSlots', nightmareRunNames.join(', ')) }}
      </p>
      <el-button
        type="danger"
        :loading="deletingNightmare"
        @click="onDeleteNightmareRuns"
      >
        {{ t('pbz.resources.deleteNightmareButton') }}
      </el-button>
    </section>

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
      <el-tab-pane
        :label="t('pbz.resources.mainWeapons')"
        name="main-weapon"
      >
        <EquipmentCategoryTab category="main-weapon" :slot="selectedSlot" />
      </el-tab-pane>
      <el-tab-pane
        :label="t('pbz.resources.phantomWeapons')"
        name="phantom-weapon"
      >
        <EquipmentCategoryTab category="phantom-weapon" :slot="selectedSlot" />
      </el-tab-pane>
      <el-tab-pane
        :label="t('pbz.resources.accessories')"
        name="accessory"
      >
        <EquipmentCategoryTab category="accessory" :slot="selectedSlot" />
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

.pbz-nightmare-delete {
  display: grid;
  gap: 12px;
  max-width: 640px;
}

.pbz-nightmare-list {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
  word-break: break-all;
}

</style>
