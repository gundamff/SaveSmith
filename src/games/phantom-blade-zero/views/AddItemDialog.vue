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
  options,
  maxAmount,
  isExisting,
  optionLabel,
  confirmAdd
} = useAddItemDialogController(props, open)
</script>

<template>
  <el-dialog v-model="open" :title="t('pbz.resources.addTitle')" width="560px">
    <el-form label-width="100px">
      <el-form-item :label="t('pbz.resources.name')">
        <el-select
          v-model="selectedId"
          filterable
          clearable
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
