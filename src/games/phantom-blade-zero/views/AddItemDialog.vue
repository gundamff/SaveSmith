<script setup lang="ts">
import { t } from '@host/i18n'
import type { PbzItemCategory } from '../catalog'
import type { PbzEditableSlot } from '../model/saveModel'
import { useAddItemDialogController } from './itemViewController'

const props = defineProps<{
  category: PbzItemCategory
  slot: PbzEditableSlot
}>()

const open = defineModel<boolean>({ required: true })
const {
  selectedId,
  amount,
  query,
  options,
  maxAmount,
  isExisting,
  optionLabel,
  selectItem,
  confirmAdd
} = useAddItemDialogController(props, open)
</script>

<template>
  <el-dialog v-model="open" :title="t('pbz.resources.addTitle')" width="560px">
    <el-form label-width="100px">
      <el-form-item :label="t('pbz.resources.name')">
        <div class="pbz-add-catalog">
          <el-input
            v-model="query"
            clearable
            :placeholder="t('pbz.resources.addSearchPlaceholder')"
          />
          <div class="pbz-add-catalog__list" role="listbox">
            <el-empty
              v-if="options.length === 0"
              :description="t('pbz.resources.empty')"
            />
            <button
              v-for="item in options"
              :key="item.id"
              type="button"
              class="pbz-add-catalog__row"
              :class="{ 'is-selected': selectedId === item.id }"
              role="option"
              :aria-selected="selectedId === item.id"
              @click="selectItem(item.id)"
            >
              <span class="pbz-add-catalog__name">{{ optionLabel(item) }}</span>
            </button>
          </div>
        </div>
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

<style scoped>
.pbz-add-catalog {
  display: grid;
  gap: 8px;
  width: 100%;
}

.pbz-add-catalog__list {
  max-height: 280px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-blank);
}

.pbz-add-catalog__row {
  display: flex;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pbz-add-catalog__row:last-child {
  border-bottom: 0;
}

.pbz-add-catalog__row:hover {
  background: var(--el-fill-color-light);
}

.pbz-add-catalog__row.is-selected {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.pbz-add-catalog__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
