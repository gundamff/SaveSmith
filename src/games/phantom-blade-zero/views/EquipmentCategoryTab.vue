<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@host/i18n'
import type { PbzEquipmentCategory } from '../catalog/equipmentCatalog'
import type { PbzEditableSlot } from '../model/saveModel'
import AddEquipmentDialog from './AddEquipmentDialog.vue'
import { useEquipmentCategoryController } from './equipmentViewController'

const props = defineProps<{
  category: PbzEquipmentCategory
  slot: PbzEditableSlot
}>()

const addOpen = ref(false)
const { filter, rows, changeLevel, removeItem } = useEquipmentCategoryController(props)
</script>

<template>
  <section class="pbz-equipment-category">
    <el-alert
      class="pbz-equipment-risk"
      type="error"
      :closable="false"
      show-icon
      :title="t('pbz.resources.equipmentRisk')"
    />

    <div class="pbz-equipment-category__toolbar">
      <el-input
        v-model="filter"
        clearable
        :placeholder="t('pbz.resources.filterPlaceholder')"
      />
      <el-button type="primary" @click="addOpen = true">
        {{ t('pbz.resources.addEquipment') }}
      </el-button>
    </div>

    <el-empty
      v-if="rows.length === 0"
      :description="t('pbz.resources.empty')"
    />
    <el-table v-else :data="rows" row-key="id">
      <el-table-column prop="name" :label="t('pbz.resources.name')" min-width="180" />
      <el-table-column prop="id" :label="t('pbz.resources.id')" min-width="200" />
      <el-table-column :label="t('pbz.resources.level')" width="190">
        <template #default="{ row }">
          <el-input-number
            :model-value="row.level"
            :min="0"
            :max="row.editMaxLevel"
            :step="1"
            @update:model-value="(value) => changeLevel(row.id, value ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column
        prop="maxLevel"
        :label="t('pbz.resources.catalogMaxLevel')"
        width="120"
      />
      <el-table-column :label="t('pbz.resources.actions')" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" link @click="removeItem(row.id)">
            {{ t('pbz.resources.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <AddEquipmentDialog
      v-model="addOpen"
      :category="category"
      :slot="slot"
    />
  </section>
</template>

<style scoped>
.pbz-equipment-category {
  display: grid;
  gap: 12px;
}

.pbz-equipment-risk {
  white-space: normal;
}

.pbz-equipment-category__toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 12px;
}
</style>
