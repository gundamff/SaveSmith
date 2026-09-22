<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { t } from '@host/i18n'
import { collectCatalog } from '../catalog/fromSave'
import {
  definitionLabel,
  fieldLabel,
  formatStatsSummary
} from '../catalog/labels'
import { clampItemStatAmount, itemStatBounds } from '../model/bounds'
import type { ItemRow, ItemStatLine } from '../model/types'
import { useEsEditor } from './inject'

interface ItemSnapshot {
  index: number
  definitionId: string
  definitionLabel: string
  quality: string
  exceptionalRoll: boolean
  statsSummary: string
}

interface StatDraft {
  index: number
  statId: string
  amount: number
  ratio: number
}

const editor = useEsEditor()
const selectedIndex = ref(0)

const catalog = computed(() => {
  void editor.rev
  return collectCatalog(editor.save.resPlain)
})

const rows = computed((): ItemSnapshot[] => {
  void editor.rev
  const labels = catalog.value.labels
  return editor.save.items.map((item, index) => ({
    index,
    definitionId: item.definitionId,
    definitionLabel: definitionLabel(item.definitionId, labels),
    quality: item.quality,
    exceptionalRoll: item.exceptionalRoll === true,
    statsSummary: formatStatsSummary(item.stats)
  }))
})

const showQualityColumn = computed(() => rows.value.some((r) => Boolean(r.quality)))

const draft = reactive({
  definitionId: '',
  quality: '',
  exceptionalRoll: false,
  stats: [] as StatDraft[],
  hasRatio: false
})

function syncDraftFromSave(): void {
  const item = editor.save.items[selectedIndex.value]
  if (!item) return
  draft.definitionId = item.definitionId
  draft.quality = item.quality
  draft.exceptionalRoll = item.exceptionalRoll === true
  draft.stats = item.stats.map((line, index) => ({
    index,
    statId: line.statId,
    amount: line.amount,
    ratio: line.ratio
  }))
  draft.hasRatio = draft.stats.some((s) => s.ratio !== 0)
}

watch(
  () => [editor.rev, selectedIndex.value] as const,
  () => syncDraftFromSave(),
  { immediate: true }
)

const hasSelection = computed(() => {
  void editor.rev
  return editor.save.items[selectedIndex.value] != null
})

const qualityOptions = computed(() => {
  const set = new Set(catalog.value.qualities)
  if (draft.quality) set.add(draft.quality)
  return [...set].sort()
})

const definitionOptions = computed(() => {
  const set = new Set(catalog.value.definitions)
  if (draft.definitionId) set.add(draft.definitionId)
  return [...set].sort()
})

const statIdOptions = computed(() => {
  const set = new Set(catalog.value.statIds)
  for (const line of draft.stats) {
    if (line.statId) set.add(line.statId)
  }
  return [...set].sort()
})

function selectRow(index: number): void {
  selectedIndex.value = index
}

function withItem(index: number, fn: (row: ItemRow) => void): void {
  editor.markDirty((s) => {
    const row = s.items[index]
    if (!row) return
    fn(row)
  })
}

function setDefinition(v: string): void {
  draft.definitionId = v
  withItem(selectedIndex.value, (row) => {
    row.definitionId = v
  })
}

function setQuality(v: string): void {
  draft.quality = v
  withItem(selectedIndex.value, (row) => {
    row.quality = v
  })
}

function setExceptional(v: boolean | string | number): void {
  const on = v === true
  draft.exceptionalRoll = on
  withItem(selectedIndex.value, (row) => {
    row.exceptionalRoll = on
  })
}

function setStatField(
  statIndex: number,
  field: keyof ItemStatLine,
  v: string | number | undefined
): void {
  if (v === undefined) return
  const line = draft.stats[statIndex]
  if (!line) return
  if (field === 'statId' || field === 'displayValue') {
    line.statId = String(v)
  } else {
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isNaN(n)) return
    line[field] =
      field === 'amount' ? clampItemStatAmount(line.statId, n) : n
  }
  withItem(selectedIndex.value, (row) => {
    const target = row.stats[statIndex]
    if (!target) return
    if (field === 'statId' || field === 'displayValue') {
      target[field] = String(v)
    } else {
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isNaN(n)) return
      target[field] =
        field === 'amount' ? clampItemStatAmount(target.statId, n) : n
    }
  })
}

function statAmountMin(statId: string): number {
  return itemStatBounds(statId).min
}

function statAmountMax(statId: string): number {
  return itemStatBounds(statId).max
}

function statAmountStep(statId: string): number {
  return itemStatBounds(statId).step ?? 1
}

function defOptionLabel(id: string): string {
  return definitionLabel(id, catalog.value.labels)
}

function statOptionLabel(id: string): string {
  return fieldLabel(id)
}
</script>

<template>
  <div class="es-items" :data-ss-rev="editor.rev">
    <p v-if="rows.length === 0" class="es-empty">{{ t('es.items.empty') }}</p>
    <template v-else>
      <el-table
        :data="rows"
        size="small"
        max-height="240"
        highlight-current-row
        row-key="index"
        @current-change="(row: ItemSnapshot | null) => row && selectRow(row.index)"
      >
        <el-table-column :label="t('es.items.definition')" min-width="160" prop="definitionLabel" />
        <el-table-column
          v-if="showQualityColumn"
          :label="t('es.items.quality')"
          width="100"
          prop="quality"
        />
        <el-table-column :label="t('es.items.stats')" min-width="260">
          <template #default="{ row }">
            <span v-if="row.statsSummary">{{ row.statsSummary }}</span>
            <span v-else class="es-muted">{{ t('es.items.noStats') }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-form
        v-if="hasSelection"
        :key="selectedIndex"
        label-width="140px"
        class="es-detail"
        :disabled="!editor.save.writeEnabled"
      >
        <el-form-item :label="t('es.items.definition')">
          <el-select
            :model-value="draft.definitionId"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            @update:model-value="(v: string) => setDefinition(v)"
          >
            <el-option
              v-for="id in definitionOptions"
              :key="id"
              :value="id"
              :label="defOptionLabel(id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="showQualityColumn || draft.quality" :label="t('es.items.quality')">
          <el-select
            :model-value="draft.quality"
            filterable
            allow-create
            clearable
            default-first-option
            style="width: 100%"
            @update:model-value="(v: string) => setQuality(v ?? '')"
          >
            <el-option v-for="q in qualityOptions" :key="q" :value="q" :label="q || '—'" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('es.items.exceptionalRoll')">
          <el-switch
            :model-value="draft.exceptionalRoll"
            @update:model-value="(v) => setExceptional(v)"
          />
        </el-form-item>
        <el-divider content-position="left">{{ t('es.items.stats') }}</el-divider>
        <p v-if="draft.stats.length === 0" class="es-empty">{{ t('es.items.noStats') }}</p>
        <template v-else>
          <div v-for="row in draft.stats" :key="row.index" class="es-stat">
            <el-form-item :label="t('es.items.statId')">
              <el-select
                :model-value="row.statId"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
                @update:model-value="(v: string) => setStatField(row.index, 'statId', v)"
              >
                <el-option
                  v-for="id in statIdOptions"
                  :key="id"
                  :value="id"
                  :label="statOptionLabel(id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('es.items.amount')">
              <el-input-number
                :model-value="row.amount"
                :min="statAmountMin(row.statId)"
                :max="statAmountMax(row.statId)"
                :step="statAmountStep(row.statId)"
                controls-position="right"
                @update:model-value="(v) => setStatField(row.index, 'amount', v ?? undefined)"
              />
            </el-form-item>
            <el-form-item v-if="draft.hasRatio" :label="t('es.items.ratio')">
              <el-input-number
                :model-value="row.ratio"
                :step="0.01"
                controls-position="right"
                @update:model-value="(v) => setStatField(row.index, 'ratio', v ?? undefined)"
              />
            </el-form-item>
          </div>
        </template>
      </el-form>
    </template>
  </div>
</template>

<style scoped>
.es-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.es-detail {
  max-width: 640px;
}
.es-empty {
  opacity: 0.7;
  margin: 0;
}
.es-muted {
  opacity: 0.55;
}
.es-stat {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.es-stat:last-child {
  border-bottom: none;
}
</style>
