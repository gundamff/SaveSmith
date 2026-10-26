<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { locale, t } from '@host/i18n'
import {
  ADDABLE_CATEGORIES,
  getItemCategory,
  lookupItemName,
  searchCatalogOptions,
  type ItemCategory
} from '../catalog/names'
import { featureFlags } from '../model/featureFlags'
import {
  addItem,
  removeItem,
  setEquippedCharm,
  setEquippedSkin,
  setEquippedSpell,
  setEquippedWeapon
} from '../model/inventory'
import { useBcEditor } from './inject'

interface ItemRow {
  index: number
  id: string
  name: string
  category: ItemCategory
  categoryLabel: string
}

interface EquipRow {
  slot: string
  id: string
  name: string
}

type AddCategory = ItemCategory | 'all-addable'

const editor = useBcEditor()
const writable = featureFlags.addItem
const addQuery = ref('')
const addCategory = ref<AddCategory>('all-addable')
const pendingAdd = ref<string | undefined>()

const loc = computed((): 'zh' | 'en' => (locale.value === 'en' ? 'en' : 'zh'))

const ADDABLE_ORDER: ItemCategory[] = ['weapon', 'spell', 'charm', 'skin']

const addCategoryOptions = computed(() => [
  { value: 'all-addable' as const, label: t('bc.inventory.catAllAddable') },
  ...ADDABLE_ORDER.map((c) => ({
    value: c,
    label: categoryLabel(c)
  }))
])

function categoryLabel(cat: ItemCategory): string {
  const key = `bc.inventory.cat.${cat}` as const
  const translated = t(key)
  return translated === key ? cat : translated
}

const inventoryRows = computed((): ItemRow[] => {
  void editor.rev
  return editor.save.player.itemsInInventory.map((id, index) => {
    const category = getItemCategory(id)
    return {
      index,
      id,
      name: lookupItemName(id, loc.value),
      category,
      categoryLabel: categoryLabel(category)
    }
  })
})

function ownedOptionsFor(cat: ItemCategory) {
  void editor.rev
  return editor.save.player.itemsInInventory
    .filter((id) => id && getItemCategory(id) === cat)
    .map((id) => ({
      id,
      label: `${lookupItemName(id, loc.value)} (${id})`
    }))
}

const weaponOptions = computed(() => ownedOptionsFor('weapon'))
const spellOptions = computed(() => ownedOptionsFor('spell'))
const skinOptions = computed(() => ownedOptionsFor('skin'))
const charmOptions = computed(() => ownedOptionsFor('charm'))

const addOptions = computed(() =>
  searchCatalogOptions(addQuery.value, loc.value, 80, addCategory.value)
)

const charmSlots = computed(() => {
  void editor.rev
  return editor.save.player.equippedCharmItems
})

const equipRows = computed((): EquipRow[] => {
  void editor.rev
  const p = editor.save.player
  const rows: EquipRow[] = [
    {
      slot: t('bc.inventory.weapon'),
      id: p.equippedWeaponItem,
      name: lookupItemName(p.equippedWeaponItem, loc.value)
    },
    {
      slot: t('bc.inventory.spell'),
      id: p.equippedSpellItem,
      name: lookupItemName(p.equippedSpellItem, loc.value)
    },
    {
      slot: t('bc.inventory.skin'),
      id: p.equippedSkin,
      name: lookupItemName(p.equippedSkin, loc.value)
    }
  ]
  p.equippedCharmItems.forEach((id, i) => {
    rows.push({
      slot: t('bc.inventory.charmSlot', i + 1),
      id,
      name: id ? lookupItemName(id, loc.value) : t('bc.inventory.empty')
    })
  })
  return rows
})

watch(addCategory, () => {
  pendingAdd.value = undefined
  addQuery.value = ''
})

function filterAdd(query: string): void {
  addQuery.value = query
}

function onAdd(): void {
  const id = pendingAdd.value
  if (!id || !writable) return
  if (!ADDABLE_CATEGORIES.has(getItemCategory(id))) return
  editor.markDirty(() => addItem(editor.save, id))
  pendingAdd.value = undefined
  addQuery.value = ''
}

function onRemove(id: string): void {
  if (!writable) return
  editor.markDirty(() => removeItem(editor.save, id))
}

function changeWeapon(id: string | undefined): void {
  if (!writable || !id) return
  editor.markDirty(() => setEquippedWeapon(editor.save, id))
}

function changeSpell(id: string | undefined): void {
  if (!writable || !id) return
  editor.markDirty(() => setEquippedSpell(editor.save, id))
}

function changeSkin(id: string | undefined): void {
  if (!writable || !id) return
  editor.markDirty(() => setEquippedSkin(editor.save, id))
}

function changeCharm(index: number, id: string | undefined): void {
  if (!writable) return
  editor.markDirty(() => setEquippedCharm(editor.save, index, id ?? ''))
}
</script>

<template>
  <div class="bc-inventory" :data-ss-rev="editor.rev">
    <el-alert
      v-if="!writable"
      type="info"
      show-icon
      :closable="false"
      :title="t('bc.inventory.needCatalog')"
      class="banner"
    />
    <el-alert
      v-else
      type="warning"
      show-icon
      :closable="false"
      :title="t('bc.inventory.noWorldSync')"
      class="banner"
    />

    <h3 class="section">{{ t('bc.inventory.items') }}</h3>
    <div v-if="writable" class="add-row">
      <el-select v-model="addCategory" style="width: 140px">
        <el-option
          v-for="opt in addCategoryOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-select
        v-model="pendingAdd"
        filterable
        clearable
        :filter-method="filterAdd"
        :placeholder="t('bc.inventory.addPlaceholder')"
        style="min-width: 240px; flex: 1"
      >
        <el-option v-for="opt in addOptions" :key="opt.id" :label="opt.label" :value="opt.id" />
      </el-select>
      <el-button type="primary" :disabled="!pendingAdd" @click="onAdd">{{ t('bc.inventory.add') }}</el-button>
    </div>
    <p v-if="writable" class="hint add-hint">{{ t('bc.inventory.addableOnlyHint') }}</p>
    <p v-if="inventoryRows.length === 0" class="empty">{{ t('bc.inventory.emptyList') }}</p>
    <el-table v-else :data="inventoryRows" size="small" row-key="index" style="width: 100%">
      <el-table-column :label="t('bc.inventory.colCategory')" prop="categoryLabel" width="100" />
      <el-table-column :label="t('bc.inventory.colId')" prop="id" min-width="180" />
      <el-table-column :label="t('bc.inventory.colName')" prop="name" min-width="180" />
      <el-table-column v-if="writable" :label="t('bc.inventory.colActions')" width="100" align="center">
        <template #default="{ row }">
          <el-button link type="danger" @click="onRemove(row.id)">{{ t('bc.inventory.remove') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <h3 class="section">{{ t('bc.inventory.equipment') }}</h3>
    <el-form v-if="writable" label-width="140px" style="max-width: 640px">
      <el-form-item :label="t('bc.inventory.weapon')">
        <el-select
          :model-value="editor.save.player.equippedWeaponItem || undefined"
          filterable
          style="width: 100%"
          @update:model-value="changeWeapon"
        >
          <el-option v-for="opt in weaponOptions" :key="'w-' + opt.id" :label="opt.label" :value="opt.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('bc.inventory.spell')">
        <el-select
          :model-value="editor.save.player.equippedSpellItem || undefined"
          filterable
          style="width: 100%"
          @update:model-value="changeSpell"
        >
          <el-option v-for="opt in spellOptions" :key="'s-' + opt.id" :label="opt.label" :value="opt.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('bc.inventory.skin')">
        <el-select
          :model-value="editor.save.player.equippedSkin || undefined"
          filterable
          style="width: 100%"
          @update:model-value="changeSkin"
        >
          <el-option v-for="opt in skinOptions" :key="'k-' + opt.id" :label="opt.label" :value="opt.id" />
        </el-select>
      </el-form-item>
      <el-form-item
        v-for="(cid, i) in charmSlots"
        :key="'c-' + i"
        :label="t('bc.inventory.charmSlot', i + 1)"
      >
        <el-select
          :model-value="cid || ''"
          filterable
          clearable
          style="width: 100%"
          @update:model-value="(v: string | undefined) => changeCharm(i, v)"
        >
          <el-option :label="t('bc.inventory.empty')" value="" />
          <el-option v-for="opt in charmOptions" :key="'c' + i + '-' + opt.id" :label="opt.label" :value="opt.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <el-table v-else :data="equipRows" size="small" row-key="slot" style="width: 100%">
      <el-table-column :label="t('bc.inventory.colSlot')" prop="slot" width="140" />
      <el-table-column :label="t('bc.inventory.colId')" prop="id" min-width="180" />
      <el-table-column :label="t('bc.inventory.colName')" prop="name" min-width="180" />
    </el-table>

    <p v-if="!writable" class="hint">{{ t('bc.inventory.readonlyHint') }}</p>
  </div>
</template>

<style scoped>
.banner {
  margin-bottom: 12px;
}
.section {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.add-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}
.add-hint {
  margin-bottom: 8px;
}
.empty,
.hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
.hint {
  margin-top: 12px;
}
.add-hint.hint {
  margin-top: 0;
}
</style>
