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
  fromDisplayLevel,
  minDisplayLevel,
  projectEquipment,
  removeEquipment,
  setEquipmentLevel,
  toDisplayLevel,
  toDisplayMax,
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
            displayLevel: toDisplayLevel(row.category, row.level),
            displayMaxLevel: toDisplayMax(row.category, row.editMaxLevel),
            displayCatalogMax: row.maxLevel,
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

  function changeLevel(id: string, displayValue: number | undefined): void {
    if (displayValue === undefined || !Number.isSafeInteger(displayValue)) return
    const internal = fromDisplayLevel(props.category, displayValue)
    try {
      editor.markDirty(() =>
        setEquipmentLevel(editor.save.model, props.slot.name, id, internal),
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
  const level = ref(minDisplayLevel(props.category))
  const query = ref('')
  const existingIds = computed(() => {
    void editor.rev
    return new Set(
      projectEquipment(props.slot, props.category).map(({ id }) => id),
    )
  })
  const options = computed(() =>
    searchPbzEquipment(props.category, query.value).filter(
      (item) => !existingIds.value.has(item.id),
    ),
  )
  const selectedItem = computed(() =>
    selectedId.value ? getPbzEquipment(selectedId.value) : undefined,
  )
  const maxLevel = computed(() => selectedItem.value?.maxLevel ?? minDisplayLevel(props.category))
  const minLevel = computed(() => minDisplayLevel(props.category))

  function resetDraft(): void {
    selectedId.value = null
    level.value = minDisplayLevel(props.category)
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
    if (level.value < minDisplayLevel(item.category)) {
      level.value = minDisplayLevel(item.category)
    }
  })

  function selectItem(id: string): void {
    selectedId.value = id
  }

  function optionLabel(item: PbzEquipmentItem): string {
    return `${pbzEquipmentName(item)} (${item.id})`
  }

  function confirmAdd(): void {
    if (!selectedId.value) return
    const internal = fromDisplayLevel(props.category, level.value)
    try {
      editor.markDirty(() =>
        addEquipment(
          editor.save.model,
          props.slot.name,
          selectedId.value!,
          internal,
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
    minLevel,
    maxLevel,
    optionLabel,
    selectItem,
    confirmAdd,
  }
}
