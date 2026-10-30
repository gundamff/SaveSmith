<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@host/i18n'
import {
  isEditableSlotName,
  projectResources,
  setAllExistingMaterials,
  setDust,
  setMaterialAmount
} from '../model/saveModel'
import { usePbzEditor } from './inject'
import { requestSlotSelection } from './slotSelection'

const editor = usePbzEditor()
const filter = ref('')
const selectedSlotName = ref(editor.save.model.selectedSlotName ?? '')

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

const materialRows = computed(() => {
  const needle = filter.value.trim().toLocaleLowerCase()
  return (resources.value?.materials ?? [])
    .map((material) => ({
      ...material,
      name: materialName(material.id)
    }))
    .filter(({ id, name }) => {
      if (!needle) return true
      return id.toLocaleLowerCase().includes(needle) ||
        name.toLocaleLowerCase().includes(needle)
    })
})

function materialName(id: string): string {
  const suffix = id.replace(/^Weapon_Material_/, '').replace(/_/g, ' ')
  return t('pbz.resources.materialName', suffix)
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

function changeDust(value: number | undefined): void {
  if (value === undefined || Number.isNaN(value)) return
  editor.markDirty(() => setDust(editor.save.model, selectedSlotName.value, value))
}

function changeMaterial(id: string, value: number | undefined): void {
  if (value === undefined || Number.isNaN(value)) return
  editor.markDirty(() =>
    setMaterialAmount(editor.save.model, selectedSlotName.value, id, value)
  )
}

function setAllMaterials(): void {
  editor.markDirty(() =>
    setAllExistingMaterials(editor.save.model, selectedSlotName.value)
  )
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

    <section class="pbz-materials">
      <div class="pbz-materials__header">
        <h3>{{ t('pbz.resources.materials') }}</h3>
        <el-button
          type="primary"
          :disabled="!resources || resources.materials.length === 0"
          @click="setAllMaterials"
        >
          {{ t('pbz.resources.setAll9999') }}
        </el-button>
      </div>

      <el-input
        v-model="filter"
        clearable
        :placeholder="t('pbz.resources.filterPlaceholder')"
      />

      <el-empty
        v-if="materialRows.length === 0"
        :description="t('pbz.resources.empty')"
      />
      <el-table v-else :data="materialRows" row-key="id">
        <el-table-column prop="name" :label="t('pbz.resources.name')" min-width="150" />
        <el-table-column prop="id" :label="t('pbz.resources.id')" min-width="240" />
        <el-table-column
          prop="currentAmount"
          :label="t('pbz.resources.current')"
          width="110"
        />
        <el-table-column
          prop="maxAmount"
          :label="t('pbz.resources.max')"
          width="110"
        />
        <el-table-column :label="t('pbz.resources.target')" width="190">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.currentAmount"
              :min="0"
              :max="9999"
              :step="1"
              @update:model-value="(value) => changeMaterial(row.id, value ?? undefined)"
            />
          </template>
        </el-table-column>
      </el-table>
    </section>
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

.pbz-materials {
  display: grid;
  gap: 12px;
}

.pbz-materials__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pbz-materials__header h3 {
  margin: 0;
}
</style>
