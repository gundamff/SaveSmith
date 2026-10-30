<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@host/i18n'
import {
  getPbzItem,
  pbzItemName,
  type PbzItemCategory
} from '../catalog'
import {
  projectInventory,
  setInventoryAmount,
  type PbzEditableSlot
} from '../model/saveModel'
import AddItemDialog from './AddItemDialog.vue'
import { usePbzEditor } from './inject'

const props = defineProps<{
  category: PbzItemCategory
  slot: PbzEditableSlot
}>()

const editor = usePbzEditor()
const filter = ref('')
const addOpen = ref(false)

const rows = computed(() => {
  void editor.rev
  const needle = filter.value.trim().toLocaleLowerCase()
  return projectInventory(props.slot, props.category)
    .flatMap((row) => {
      const item = getPbzItem(row.id)
      if (!item) return []
      return [{
        ...row,
        name: pbzItemName(item),
        editMaxAmount: item.maxAmount,
        item
      }]
    })
    .filter(({ id, item }) =>
      !needle || [id, item.zh, item.en].some((value) =>
        value.toLocaleLowerCase().includes(needle)
      )
    )
})

function changeAmount(id: string, value: number | undefined): void {
  if (value === undefined || !Number.isSafeInteger(value)) return
  editor.markDirty(() =>
    setInventoryAmount(editor.save.model, props.slot.name, id, value)
  )
}
</script>

<template>
  <section class="pbz-inventory-category">
    <div class="pbz-inventory-category__toolbar">
      <el-input
        v-model="filter"
        clearable
        :placeholder="t('pbz.resources.filterPlaceholder')"
      />
      <el-button type="primary" @click="addOpen = true">
        {{ t('pbz.resources.addItem') }}
      </el-button>
    </div>

    <el-empty
      v-if="rows.length === 0"
      :description="t('pbz.resources.empty')"
    />
    <el-table v-else :data="rows" row-key="id">
      <el-table-column prop="name" :label="t('pbz.resources.name')" min-width="180" />
      <el-table-column prop="id" :label="t('pbz.resources.id')" min-width="240" />
      <el-table-column
        prop="currentAmount"
        :label="t('pbz.resources.current')"
        width="110"
      />
      <el-table-column
        prop="maxAmount"
        :label="t('pbz.resources.max')"
        width="130"
      />
      <el-table-column :label="t('pbz.resources.target')" width="190">
        <template #default="{ row }">
          <el-input-number
            :model-value="row.currentAmount"
            :min="0"
            :max="row.editMaxAmount"
            :step="1"
            @update:model-value="(value) => changeAmount(row.id, value ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>

    <AddItemDialog
      v-model="addOpen"
      :category="category"
      :slot="slot"
    />
  </section>
</template>

<style scoped>
.pbz-inventory-category {
  display: grid;
  gap: 12px;
}

.pbz-inventory-category__toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 12px;
}
</style>
