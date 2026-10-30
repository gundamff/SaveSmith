import { computed, ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { translateError } from '@host/i18n'
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

  return { filter, rows, changeAmount }
}

export function useAddItemDialogController(
  props: ItemViewProps,
  open: Ref<boolean>
) {
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

  function resetDraft(): void {
    selectedId.value = null
    amount.value = 1
    options.value = searchPbzItems(props.category, '')
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

  return {
    selectedId,
    amount,
    options,
    maxAmount,
    isExisting,
    search,
    optionLabel,
    confirmAdd
  }
}
