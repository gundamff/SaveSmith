<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { locale } from '@host/i18n'
import { t } from '../i18n'
import { isActiveCookRow, recipeCatalog, recipeKnown, setRecipeKnown } from '../model/recipes'
import { useDsEditor } from './inject'

const MAX_STACK = 99_999_999

interface CookSnapshot {
  index: number
  itemCid: number
  stackCnt: number
}

const editor = useDsEditor()
const typedKey = ref(0)

const rows = computed((): CookSnapshot[] => {
  void editor.rev
  return editor.save.cookItems.flatMap((row, index) => {
    if (!isActiveCookRow(row.deletedDate)) return []
    return [{ index, itemCid: row.itemCid, stackCnt: row.stackCnt }]
  })
})

const catalogRows = computed(() => {
  void editor.rev
  const loc = locale.value === 'en' ? 'en' : 'zh'
  return recipeCatalog.map((recipe) => ({
    switchKey: recipe.switchKey,
    dishCid: recipe.dishCid,
    label: recipe.name[loc] || recipe.name.zh || `#${recipe.switchKey}`,
    known: recipeKnown(editor.save.switches, recipe.switchKey)
  }))
})

function changeStack(index: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.cookItems[index]
    if (!row) return
    row.stackCnt = Math.max(0, Math.floor(v))
  })
}

function setTypedKey(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  typedKey.value = Math.max(0, Math.floor(v))
}

function applyTyped(known: boolean): void {
  const switchKey = typedKey.value
  if (!Number.isFinite(switchKey) || switchKey <= 0) return
  editor.markDirty(() => {
    setRecipeKnown(editor.save.switches, switchKey, known)
  })
  ElMessage.success(known ? t('cooking.unlocked') : t('cooking.locked'))
}

function toggleCatalog(switchKey: number, known: boolean): void {
  editor.markDirty(() => {
    setRecipeKnown(editor.save.switches, switchKey, known)
  })
}

function unlockAllCatalog(): void {
  if (recipeCatalog.length === 0) return
  editor.markDirty(() => {
    for (const recipe of recipeCatalog) {
      setRecipeKnown(editor.save.switches, recipe.switchKey, true)
    }
  })
  ElMessage.success(t('cooking.unlocked'))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <span class="add-label">{{ t('cooking.switchKey') }}</span>
      <el-input-number
        size="small"
        :model-value="typedKey"
        :min="1"
        :max="MAX_STACK"
        controls-position="right"
        @update:model-value="(v) => setTypedKey(v ?? undefined)"
      />
      <el-button type="primary" :disabled="typedKey <= 0" @click="applyTyped(true)">{{ t('cooking.unlock') }}</el-button>
      <el-button :disabled="typedKey <= 0" @click="applyTyped(false)">{{ t('cooking.lock') }}</el-button>
      <el-button v-if="recipeCatalog.length > 0" @click="unlockAllCatalog()">{{ t('cooking.unlockAll') }}</el-button>
    </div>

    <p v-if="rows.length === 0" class="ds-empty">{{ t('cooking.empty') }}</p>
    <el-table v-else :data="rows" size="small" max-height="360" row-key="index">
      <el-table-column :label="t('cooking.cid')" min-width="140">
        <template #default="{ row }">{{ row.itemCid }}</template>
      </el-table-column>
      <el-table-column :label="t('cooking.stack')" width="220">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.stackCnt"
            :min="0"
            :max="MAX_STACK"
            controls-position="right"
            @update:model-value="(v) => changeStack(row.index, v ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-table v-if="catalogRows.length > 0" :data="catalogRows" size="small" max-height="280" row-key="switchKey" class="recipes">
      <el-table-column :label="t('cooking.recipe')" min-width="160">
        <template #default="{ row }">{{ row.label }}</template>
      </el-table-column>
      <el-table-column :label="t('cooking.cid')" min-width="110">
        <template #default="{ row }">{{ row.dishCid ?? '—' }}</template>
      </el-table-column>
      <el-table-column :label="t('cooking.switchKey')" width="120">
        <template #default="{ row }">{{ row.switchKey }}</template>
      </el-table-column>
      <el-table-column :label="t('cooking.known')" width="90">
        <template #default="{ row }">
          <el-switch :model-value="row.known" @update:model-value="(v) => toggleCatalog(row.switchKey, Boolean(v))" />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.add-label {
  opacity: 0.8;
  font-size: 13px;
}
.ds-empty {
  opacity: 0.7;
  margin: 0;
}
.recipes {
  margin-top: 16px;
}
</style>
