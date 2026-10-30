import { computed, ref, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  removeInventoryItem,
  setInventoryAmount,
  type PbzEditableSlot
} from '../model/saveModel'
import { usePbzEditor } from './inject'

interface ItemViewProps {
  readonly category: PbzItemCategory
  readonly slot: PbzEditableSlot
}

export function useInventoryCategoryController(props: ItemViewProps) {
  const editor = usePbzEditor()
  const filter = ref('')
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

  async function removeItem(id: string): Promise<void> {
    const item = getPbzItem(id)
    if (!item) return
    try {
      await ElMessageBox.confirm(
        t('pbz.resources.deleteConfirm', pbzItemName(item), id),
        t('pbz.resources.deleteTitle'),
        {
          type: 'warning',
          confirmButtonText: t('pbz.resources.delete'),
          cancelButtonText: t('pbz.resources.cancel')
        }
      )
    } catch {
      return
    }
    try {
      editor.markDirty(() =>
        removeInventoryItem(editor.save.model, props.slot.name, id)
      )
    } catch (error) {
      ElMessage.error(translateError(error))
    }
  }

  return { filter, rows, changeAmount, removeItem }
}

export function useAddItemDialogController(
  props: ItemViewProps,
  open: Ref<boolean>
) {
  const editor = usePbzEditor()
  const selectedId = ref<string | null>(null)
  const amount = ref(1)
  const query = ref('')
  const options = computed(() => searchPbzItems(props.category, query.value))

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
  const thresholdRisk = computed(() => selectedItem.value?.thresholdRisk === true)

  function resetDraft(): void {
    selectedId.value = null
    amount.value = 1
    query.value = ''
  }

  watch(open, (visible) => {
    if (visible) resetDraft()
  })
  watch(
    () => [props.slot, props.category] as const,
    () => {
      resetDraft()
      open.value = false
    }
  )

  function optionLabel(item: PbzCatalogItem): string {
    return `${pbzItemName(item)} · ${item.id}`
  }

  function selectItem(id: string): void {
    selectedId.value = id
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

  return {
    selectedId,
    amount,
    query,
    options,
    maxAmount,
    isExisting,
    thresholdRisk,
    optionLabel,
    selectItem,
    confirmAdd
  }
}
