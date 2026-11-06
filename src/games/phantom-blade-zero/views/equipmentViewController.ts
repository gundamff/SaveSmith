import { computed, ref, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t, translateError } from '@host/i18n'
import {
  getPbzEquipment,
  pbzEquipmentName,
  searchPbzEquipment,
  type PbzEquipmentCategory,
  type PbzEquipmentItem,
} from '../catalog/equipmentCatalog'
import {
  addEquipment,
  projectEquipment,
  removeEquipment,
  setEquipmentLevel,
} from '../model/equipment'
import type { PbzEditableSlot } from '../model/saveModel'
import { usePbzEditor } from './inject'

interface EquipmentViewProps {
  readonly category: PbzEquipmentCategory
  readonly slot: PbzEditableSlot
}

export function useEquipmentCategoryController(props: EquipmentViewProps) {
  const editor = usePbzEditor()
  const filter = ref('')
  const rows = computed(() => {
    void editor.rev
    const needle = filter.value.trim().toLocaleLowerCase()
    return projectEquipment(props.slot, props.category)
      .flatMap((row) => {
        const item = getPbzEquipment(row.id)
        if (!item) return []
        return [
          {
            ...row,
            name: pbzEquipmentName(item),
            item,
          },
        ]
      })
      .filter(
        ({ id, item }) =>
          !needle ||
          [id, item.zh, item.en].some((value) =>
            value.toLocaleLowerCase().includes(needle),
          ),
      )
  })

  function changeLevel(id: string, value: number | undefined): void {
    if (value === undefined || !Number.isSafeInteger(value)) return
    try {
      editor.markDirty(() =>
        setEquipmentLevel(editor.save.model, props.slot.name, id, value),
      )
    } catch (error) {
      ElMessage.error(translateError(error))
    }
  }

  async function removeItem(id: string): Promise<void> {
    const item = getPbzEquipment(id)
    if (!item) return
    try {
      await ElMessageBox.confirm(
        t('pbz.resources.deleteEquipmentConfirm', pbzEquipmentName(item), id),
        t('pbz.resources.deleteTitle'),
        {
          type: 'warning',
          confirmButtonText: t('pbz.resources.delete'),
          cancelButtonText: t('pbz.resources.cancel'),
        },
      )
    } catch {
      return
    }
    try {
      editor.markDirty(() =>
        removeEquipment(editor.save.model, props.slot.name, id),
      )
    } catch (error) {
      if (
        props.category === 'main-weapon' ||
        props.category === 'phantom-weapon'
      ) {
        ElMessage.error(t('pbz.resources.equippedRefuseDelete'))
      } else {
        ElMessage.error(translateError(error))
      }
    }
  }

  return { filter, rows, changeLevel, removeItem }
}

export function useAddEquipmentDialogController(
  props: EquipmentViewProps,
  open: Ref<boolean>,
) {
  const editor = usePbzEditor()
  const selectedId = ref<string | null>(null)
  const level = ref(0)
  const query = ref('')
  const options = computed(() => searchPbzEquipment(props.category, query.value))
  const selectedItem = computed(() =>
    selectedId.value ? getPbzEquipment(selectedId.value) : undefined,
  )
  const maxLevel = computed(() => selectedItem.value?.maxLevel ?? 0)
  const existingIds = computed(() => {
    void editor.rev
    return new Set(
      projectEquipment(props.slot, props.category).map(({ id }) => id),
    )
  })
  const isExisting = computed(
    () => selectedId.value !== null && existingIds.value.has(selectedId.value),
  )

  function resetDraft(): void {
    selectedId.value = null
    level.value = 0
    query.value = ''
  }

  watch(open, (visible) => {
    if (visible) resetDraft()
  })
  watch(
    () => [props.slot, props.category] as const,
    () => {
      resetDraft()
    },
  )
  watch(selectedItem, (item) => {
    if (!item) return
    if (level.value > item.maxLevel) level.value = item.maxLevel
  })

  function selectItem(id: string): void {
    selectedId.value = id
  }

  function optionLabel(item: PbzEquipmentItem): string {
    return `${pbzEquipmentName(item)} (${item.id})`
  }

  function confirmAdd(): void {
    if (!selectedId.value) return
    try {
      editor.markDirty(() =>
        addEquipment(
          editor.save.model,
          props.slot.name,
          selectedId.value!,
          level.value,
        ),
      )
      open.value = false
    } catch (error) {
      ElMessage.error(translateError(error))
    }
  }

  return {
    selectedId,
    level,
    query,
    options,
    maxLevel,
    isExisting,
    optionLabel,
    selectItem,
    confirmAdd,
  }
}
