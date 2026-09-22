<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { t } from '@host/i18n'
import { collectCatalog } from '../catalog/fromSave'
import {
  classLabel,
  definitionLabel,
  fieldLabel,
  GROWTH_STYLE_OPTIONS,
  growthStyleLabel,
  skillLabel
} from '../catalog/labels'
import {
  clampFighterField,
  clampItemStatAmount,
  fighterFieldBounds,
  injuryBattlesBounds,
  itemStatBounds
} from '../model/bounds'
import { clearInjury, maxProgress } from '../model/fighters'
import { MAX_EXP, MAX_LEVEL } from '../model/fields'
import type { FighterRow, ItemRow } from '../model/types'
import { useEsEditor } from './inject'

interface FighterSnapshot {
  index: number
  id: string
  displayName: string
  profession: string
  level: number
  experience: number
  injured: boolean
}

interface MapEntry {
  key: string
  label: string
  value: number
}

interface SkillEntry {
  key: string
  path: string
  label: string
}

interface EquippedStatDraft {
  index: number
  statId: string
  label: string
  amount: number
}

interface EquippedDraft {
  slot: number
  itemIndex: number
  instanceId: string
  definitionLabel: string
  exceptionalRoll: boolean
  stats: EquippedStatDraft[]
}

const editor = useEsEditor()
const selectedIndex = ref(0)

const catalog = computed(() => {
  void editor.rev
  return collectCatalog(editor.save.resPlain)
})

const rows = computed((): FighterSnapshot[] => {
  void editor.rev
  const labels = catalog.value.labels
  return editor.save.fighters.map((f, index) => ({
    index,
    id: f.id,
    displayName: f.displayName || f.id || `#${index}`,
    profession: classLabel(f.configId || '', labels),
    level: f.level,
    experience: f.experience,
    injured: f.injured
  }))
})

/** Local drafts — avoid binding el-input-number to markRaw row fields directly. */
const draft = reactive({
  profession: '',
  level: 0,
  experience: 0,
  injuryBattlesRemaining: 0,
  growthStyles: [] as string[],
  skills: [] as SkillEntry[],
  birth: [] as MapEntry[],
  growthBase: [] as MapEntry[],
  career: [] as MapEntry[],
  personality: [] as MapEntry[],
  aiProfile: [] as MapEntry[],
  equipped: [] as EquippedDraft[]
})

const growthStyleOptions = computed(() => {
  const set = new Set<string>([...GROWTH_STYLE_OPTIONS])
  for (const s of draft.growthStyles) {
    if (s) set.add(s)
  }
  return [...set]
})

function mapEntries(map: Record<string, number>): MapEntry[] {
  return Object.entries(map).map(([key, value]) => ({
    key,
    label: fieldLabel(key),
    value
  }))
}

function syncDraftFromSave(): void {
  const f = editor.save.fighters[selectedIndex.value]
  if (!f) return
  const labels = catalog.value.labels
  draft.profession = classLabel(f.configId || '', labels)
  draft.level = f.level
  draft.experience = f.experience
  draft.injuryBattlesRemaining = f.injuryBattlesRemaining
  const gs = f.growthStyles
  draft.growthStyles = Array.isArray(gs) ? gs.map((x) => String(x)).filter(Boolean) : []
  draft.skills = Object.keys(f.skills)
    .sort()
    .map((key) => {
      const path = f.skills[key] ?? ''
      return { key, path, label: skillLabel(path, labels) }
    })
  draft.birth = mapEntries(f.birth)
  draft.growthBase = mapEntries(f.growthBase)
  draft.career = mapEntries(f.career)
  draft.personality = mapEntries(f.personality)
  draft.aiProfile = mapEntries(f.aiProfile)
  draft.equipped = buildEquippedDraft(f, labels)
}

function buildEquippedDraft(
  fighter: FighterRow,
  labels: ReturnType<typeof collectCatalog>['labels']
): EquippedDraft[] {
  const ids = fighter.equippedItemInstanceIds
  const slots = ids.length >= 2 ? ids.slice(0, 2) : [...ids, '', ''].slice(0, 2)
  return slots.map((instanceId, slot) => {
    if (!instanceId) {
      return {
        slot,
        itemIndex: -1,
        instanceId: '',
        definitionLabel: '',
        exceptionalRoll: false,
        stats: []
      }
    }
    const itemIndex = editor.save.items.findIndex((it) => it.instanceId === instanceId)
    if (itemIndex < 0) {
      return {
        slot,
        itemIndex: -1,
        instanceId,
        definitionLabel: instanceId,
        exceptionalRoll: false,
        stats: []
      }
    }
    const item = editor.save.items[itemIndex]!
    return {
      slot,
      itemIndex,
      instanceId,
      definitionLabel: definitionLabel(item.definitionId, labels),
      exceptionalRoll: item.exceptionalRoll === true,
      stats: item.stats.map((line, index) => ({
        index,
        statId: line.statId,
        label: fieldLabel(line.statId),
        amount: line.amount
      }))
    }
  })
}

watch(
  () => [editor.rev, selectedIndex.value] as const,
  () => syncDraftFromSave(),
  { immediate: true }
)

const hasSelection = computed(() => {
  void editor.rev
  return editor.save.fighters[selectedIndex.value] != null
})

function selectRow(index: number): void {
  selectedIndex.value = index
}

function withFighter(index: number, fn: (row: FighterRow) => void): void {
  editor.markDirty((s) => {
    const row = s.fighters[index]
    if (!row) return
    fn(row)
  })
}

function setNum(
  field: 'level' | 'experience' | 'injuryBattlesRemaining',
  v: number | undefined
): void {
  if (v === undefined || Number.isNaN(v)) return
  let n = v
  if (field === 'level') n = Math.max(0, Math.min(MAX_LEVEL, Math.floor(v)))
  else if (field === 'experience') n = Math.max(0, Math.min(MAX_EXP, Math.floor(v)))
  else n = clampFighterField('injury_battles_remaining', Math.max(0, Math.floor(v)))
  draft[field] = n
  withFighter(selectedIndex.value, (row) => {
    row[field] = n
  })
}

function setMapNum(
  map: 'birth' | 'growthBase' | 'career' | 'personality' | 'aiProfile',
  key: string,
  v: number | undefined
): void {
  if (v === undefined || Number.isNaN(v)) return
  const n = clampFighterField(key, v)
  const list = draft[map]
  const entry = list.find((e) => e.key === key)
  if (entry) entry.value = n
  withFighter(selectedIndex.value, (row) => {
    row[map][key] = n
  })
}

function withItem(itemIndex: number, fn: (row: ItemRow) => void): void {
  if (itemIndex < 0) return
  editor.markDirty((s) => {
    const row = s.items[itemIndex]
    if (!row) return
    fn(row)
  })
}

function setEquippedStat(itemIndex: number, statIndex: number, statId: string, v: number | undefined): void {
  if (v === undefined || itemIndex < 0) return
  const n = clampItemStatAmount(statId, v)
  const eq = draft.equipped.find((e) => e.itemIndex === itemIndex)
  const line = eq?.stats[statIndex]
  if (line) line.amount = n
  withItem(itemIndex, (row) => {
    const target = row.stats[statIndex]
    if (!target) return
    target.amount = n
  })
}

function setEquippedExceptional(itemIndex: number, v: boolean | string | number): void {
  if (itemIndex < 0) return
  const on = v === true
  const eq = draft.equipped.find((e) => e.itemIndex === itemIndex)
  if (eq) eq.exceptionalRoll = on
  withItem(itemIndex, (row) => {
    row.exceptionalRoll = on
  })
}

function fieldMin(key: string): number {
  return fighterFieldBounds(key).min
}

function fieldMax(key: string): number {
  return fighterFieldBounds(key).max
}

function fieldStep(key: string): number {
  return fighterFieldBounds(key).step ?? 1
}

function statMin(statId: string): number {
  return itemStatBounds(statId).min
}

function statMax(statId: string): number {
  return itemStatBounds(statId).max
}

function statStep(statId: string): number {
  return itemStatBounds(statId).step ?? 1
}

function setSkill(skillKey: string, path: string): void {
  const sk = draft.skills.find((s) => s.key === skillKey)
  if (sk) {
    sk.path = path
    sk.label = skillLabel(path, catalog.value.labels)
  }
  withFighter(selectedIndex.value, (row) => {
    row.skills[skillKey] = path
  })
}

function setGrowthStyles(values: string[]): void {
  const next = [...new Set(values.filter(Boolean))]
  draft.growthStyles = next
  withFighter(selectedIndex.value, (row) => {
    row.growthStyles = next
  })
}

function onClearInjury(): void {
  withFighter(selectedIndex.value, clearInjury)
}

function onMaxProgress(): void {
  withFighter(selectedIndex.value, (row) =>
    maxProgress(row, { maxLevel: MAX_LEVEL, maxExp: MAX_EXP })
  )
}

function skillOptionLabel(path: string): string {
  return skillLabel(path, catalog.value.labels)
}
</script>

<template>
  <div class="es-fighters" :data-ss-rev="editor.rev">
    <p v-if="rows.length === 0" class="es-empty">{{ t('es.fighters.empty') }}</p>
    <template v-else>
      <el-table
        :data="rows"
        size="small"
        max-height="240"
        highlight-current-row
        row-key="index"
        @current-change="(row: FighterSnapshot | null) => row && selectRow(row.index)"
      >
        <el-table-column :label="t('es.fighters.name')" min-width="120" prop="displayName" />
        <el-table-column :label="t('es.fighters.profession')" min-width="110" prop="profession" />
        <el-table-column :label="t('es.fighters.level')" width="80" prop="level" />
        <el-table-column :label="t('es.fighters.experience')" width="90" prop="experience" />
        <el-table-column :label="t('es.fighters.injured')" width="80">
          <template #default="{ row }">
            {{ row.injured ? t('es.overview.yes') : t('es.overview.no') }}
          </template>
        </el-table-column>
      </el-table>
      <el-form
        v-if="hasSelection"
        :key="selectedIndex"
        label-width="150px"
        class="es-detail"
        :disabled="!editor.save.writeEnabled"
      >
        <div class="es-actions">
          <el-button size="small" @click="onClearInjury()">
            {{ t('es.fighters.clearInjury') }}
          </el-button>
          <el-button size="small" type="primary" @click="onMaxProgress()">
            {{ t('es.fighters.maxProgress') }}
          </el-button>
        </div>
        <el-form-item :label="t('es.fighters.profession')">
          <span>{{ draft.profession }}</span>
        </el-form-item>
        <el-form-item :label="t('es.fighters.level')">
          <el-input-number
            :model-value="draft.level"
            :min="0"
            :max="MAX_LEVEL"
            controls-position="right"
            @update:model-value="(v) => setNum('level', v ?? undefined)"
          />
        </el-form-item>
        <el-form-item :label="t('es.fighters.experience')">
          <el-input-number
            :model-value="draft.experience"
            :min="0"
            :max="MAX_EXP"
            controls-position="right"
            @update:model-value="(v) => setNum('experience', v ?? undefined)"
          />
        </el-form-item>
        <el-form-item :label="t('es.fighters.growthStyles')">
          <el-select
            :model-value="draft.growthStyles"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            :placeholder="t('es.fighters.growthStylesHint')"
            @update:model-value="(v: string[]) => setGrowthStyles(v ?? [])"
          >
            <el-option
              v-for="style in growthStyleOptions"
              :key="style"
              :value="style"
              :label="growthStyleLabel(style)"
            />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.equipped') }}</el-divider>
        <div v-for="eq in draft.equipped" :key="'eq-' + eq.slot" class="es-equipped">
          <p class="es-equipped-title">
            {{ t('es.fighters.equippedSlot', eq.slot + 1) }}：
            <span v-if="eq.itemIndex >= 0">{{ eq.definitionLabel }}</span>
            <span v-else class="es-muted">{{ t('es.fighters.equippedEmpty') }}</span>
          </p>
          <template v-if="eq.itemIndex >= 0">
            <el-form-item :label="t('es.items.exceptionalRoll')">
              <el-switch
                :model-value="eq.exceptionalRoll"
                @update:model-value="(v) => setEquippedExceptional(eq.itemIndex, v)"
              />
            </el-form-item>
            <el-form-item
              v-for="st in eq.stats"
              :key="'eq-st-' + st.index"
              :label="st.label"
            >
              <el-input-number
                :model-value="st.amount"
                :min="statMin(st.statId)"
                :max="statMax(st.statId)"
                :step="statStep(st.statId)"
                controls-position="right"
                @update:model-value="(v) => setEquippedStat(eq.itemIndex, st.index, st.statId, v ?? undefined)"
              />
            </el-form-item>
          </template>
        </div>
        <el-divider content-position="left">{{ t('es.fighters.skills') }}</el-divider>
        <el-form-item
          v-for="(sk, i) in draft.skills"
          :key="sk.key"
          :label="t('es.fighters.skillSlot', i + 1)"
        >
          <el-select
            :model-value="sk.path"
            filterable
            style="width: 100%"
            @update:model-value="(v: string) => setSkill(sk.key, v)"
          >
            <el-option
              v-for="path in catalog.skills"
              :key="path"
              :value="path"
              :label="skillOptionLabel(path)"
            />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.injury') }}</el-divider>
        <el-form-item :label="t('es.fighters.injuryBattles')">
          <el-input-number
            :model-value="draft.injuryBattlesRemaining"
            :min="injuryBattlesBounds().min"
            :max="injuryBattlesBounds().max"
            controls-position="right"
            @update:model-value="(v) => setNum('injuryBattlesRemaining', v ?? undefined)"
          />
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.birth') }}</el-divider>
        <el-form-item v-for="entry in draft.birth" :key="'b-' + entry.key" :label="entry.label">
          <el-input-number
            :model-value="entry.value"
            :min="fieldMin(entry.key)"
            :max="fieldMax(entry.key)"
            :step="fieldStep(entry.key)"
            controls-position="right"
            @update:model-value="(v) => setMapNum('birth', entry.key, v ?? undefined)"
          />
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.growthBase') }}</el-divider>
        <el-form-item
          v-for="entry in draft.growthBase"
          :key="'g-' + entry.key"
          :label="entry.label"
        >
          <el-input-number
            :model-value="entry.value"
            :min="fieldMin(entry.key)"
            :max="fieldMax(entry.key)"
            :step="fieldStep(entry.key)"
            controls-position="right"
            @update:model-value="(v) => setMapNum('growthBase', entry.key, v ?? undefined)"
          />
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.career') }}</el-divider>
        <el-form-item v-for="entry in draft.career" :key="'c-' + entry.key" :label="entry.label">
          <el-input-number
            :model-value="entry.value"
            :min="fieldMin(entry.key)"
            :max="fieldMax(entry.key)"
            :step="fieldStep(entry.key)"
            controls-position="right"
            @update:model-value="(v) => setMapNum('career', entry.key, v ?? undefined)"
          />
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.personality') }}</el-divider>
        <el-form-item
          v-for="entry in draft.personality"
          :key="'p-' + entry.key"
          :label="entry.label"
        >
          <el-input-number
            :model-value="entry.value"
            :min="fieldMin(entry.key)"
            :max="fieldMax(entry.key)"
            :step="fieldStep(entry.key)"
            controls-position="right"
            @update:model-value="(v) => setMapNum('personality', entry.key, v ?? undefined)"
          />
        </el-form-item>
        <el-divider content-position="left">{{ t('es.fighters.aiProfile') }}</el-divider>
        <el-form-item
          v-for="entry in draft.aiProfile"
          :key="'a-' + entry.key"
          :label="entry.label"
        >
          <el-input-number
            :model-value="entry.value"
            :min="fieldMin(entry.key)"
            :max="fieldMax(entry.key)"
            :step="fieldStep(entry.key)"
            controls-position="right"
            @update:model-value="(v) => setMapNum('aiProfile', entry.key, v ?? undefined)"
          />
        </el-form-item>
      </el-form>
    </template>
  </div>
</template>

<style scoped>
.es-fighters {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.es-detail {
  max-width: 640px;
}
.es-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.es-empty {
  opacity: 0.7;
  margin: 0;
}
.es-muted {
  opacity: 0.55;
}
.es-equipped {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.es-equipped-title {
  margin: 0 0 8px;
  font-weight: 600;
}
</style>
