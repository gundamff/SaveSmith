<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { t, translateError } from '@host/i18n'
import {
  getPbzItem,
  pbzItemName,
  searchPbzItems,
  type PbzCatalogItem,
  type PbzItemCategory
} from '../catalog'
import {
  addInventoryItem,
  projectInventory,
  type PbzEditableSlot
} from '../model/saveModel'
import { usePbzEditor } from './inject'

const props = defineProps<{
  category: PbzItemCategory
  slot: PbzEditableSlot
}>()

const open = defineModel<boolean>({ required: true })
const editor = usePbzEditor()
const selectedId = ref<string | null>(null)
const amount = ref(1)
const options = ref<PbzCatalogItem[]>([])

const selectedItem = computed(() =>
  selectedId.value ? getPbzItem(selectedId.value) : undefined
)
const maxAmount = computed(() => selectedItem.value?.maxAmount ?? 1)
const existingIds = computed(() => {
  void editor.rev
  return new Set(projectInventory(props.slot, props.category).map(({ id }) => id))
})
const isExisting = computed(() =>
  selectedId.value !== null && existingIds.value.has(selectedId.value)
)

watch(open, (visible) => {
  if (!visible) return
  selectedId.value = null
  amount.value = 1
  options.value = searchPbzItems(props.category, '')
})

function search(query: string): void {
  options.value = searchPbzItems(props.category, query)
}

function optionLabel(item: PbzCatalogItem): string {
  return `${pbzItemName(item)} · ${item.id}`
}

function confirmAdd(): void {
  if (!selectedId.value || !Number.isSafeInteger(amount.value)) return
  try {
    editor.markDirty(() =>
      addInventoryItem(editor.save.model, props.slot.name, selectedId.value!, amount.value)
    )
    open.value = false
  } catch (error) {
    ElMessage.error(translateError(error))
  }
}
</script>

<template>
  <el-dialog v-model="open" :title="t('pbz.resources.addTitle')" width="560px">
    <el-form label-width="100px">
      <el-form-item :label="t('pbz.resources.name')">
        <el-select
          v-model="selectedId"
          filterable
          remote
          :remote-method="search"
          :placeholder="t('pbz.resources.addSearchPlaceholder')"
          style="width: 100%"
        >
          <el-option
            v-for="item in options"
            :key="item.id"
            :label="optionLabel(item)"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('pbz.resources.amount')">
        <el-input-number
          v-model="amount"
          :min="1"
          :max="maxAmount"
          :step="1"
        />
      </el-form-item>

      <el-alert
        v-if="selectedId"
        :closable="false"
        :type="isExisting ? 'warning' : 'info'"
        :title="t(isExisting ? 'pbz.resources.addExistingHint' : 'pbz.resources.addNewHint')"
      />
    </el-form>

    <template #footer>
      <el-button @click="open = false">{{ t('pbz.resources.cancel') }}</el-button>
      <el-button type="primary" :disabled="!selectedId" @click="confirmAdd">
        {{ t('pbz.resources.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>
