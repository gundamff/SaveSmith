<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '@host/i18n'
import type { HxsDoc } from '../model/hxbit'
import {
  projectUser,
  setBossCells,
  setBossRushUnlock,
  setDeathCells,
  setDeathMoney,
  setHeroHeadSkin,
  setHeroSkin,
  type BossRushRow
} from '../model/userModel'
import { headOptions, outfitOptions } from '../model/catalog'
import { useDcEditor } from './inject'

const DIFFICULTY_KEYS = [
  'dc.difficulty.normal',
  'dc.difficulty.hard',
  'dc.difficulty.veryHard',
  'dc.difficulty.expert',
  'dc.difficulty.nightmare',
  'dc.difficulty.hell'
]

const editor = useDcEditor()
const view = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc)
})
const bossCellChoices = computed(() => {
  void editor.rev
  return DIFFICULTY_KEYS.map((key, i) => ({ value: i, label: `${i} · ${t(key)}` }))
})

function changeBossCells(v: number): void {
  editor.markDirty(() => setBossCells(editor.save.doc, v))
}
const bossRows = computed((): BossRushRow[] => view.value.bossRush.map((b) => ({ ...b })))
const outfitChoices = computed(() => {
  void editor.rev
  return outfitOptions(locale.value, view.value.heroSkin)
})
const headChoices = computed(() => {
  void editor.rev
  return headOptions(locale.value, view.value.heroHeadSkin)
})

function bossLabel(field: string): string {
  const key = `dc.bossRush.${field}`
  const text = t(key)
  return text === key ? field : text
}

function changeNum(setter: (doc: HxsDoc, v: number) => void, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => setter(editor.save.doc, v))
}

function changeSkin(setter: (doc: HxsDoc, v: string) => void, v: string): void {
  editor.markDirty(() => setter(editor.save.doc, v))
}

function toggleBoss(field: string, idx: number, v: boolean | string | number): void {
  editor.markDirty(() => setBossRushUnlock(editor.save.doc, field, idx, v === true))
}
</script>

<template>
  <div class="dc-resources" :data-ss-rev="editor.rev">
    <p v-if="!view.editable" class="dc-empty">{{ t('dc.resources.unreadable') }}</p>
    <template v-else>
      <el-form label-width="180px" style="max-width: 480px">
        <el-form-item :label="t('dc.resources.deathMoney')">
          <el-input-number
            :model-value="view.deathMoney"
            :min="0"
            :max="2147483647"
            @update:model-value="(v) => changeNum(setDeathMoney, v ?? undefined)"
          />
        </el-form-item>
        <el-form-item :label="t('dc.resources.deathCells')">
          <el-input-number
            :model-value="view.deathCells"
            :min="0"
            :max="2147483647"
            @update:model-value="(v) => changeNum(setDeathCells, v ?? undefined)"
          />
        </el-form-item>
        <el-form-item :label="t('dc.resources.bossCells')">
          <el-select
            :model-value="view.bossCells"
            style="max-width: 240px"
            @update:model-value="(v: number) => changeBossCells(v)"
          >
            <el-option v-for="o in bossCellChoices" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dc.resources.heroSkin')">
          <el-select
            :model-value="view.heroSkin"
            filterable
            style="max-width: 240px"
            @update:model-value="(v: string) => changeSkin(setHeroSkin, v)"
          >
            <el-option v-for="o in outfitChoices" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dc.resources.heroHeadSkin')">
          <el-select
            :model-value="view.heroHeadSkin"
            filterable
            style="max-width: 240px"
            @update:model-value="(v: string) => changeSkin(setHeroHeadSkin, v)"
          >
            <el-option v-for="o in headChoices" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
      </el-form>

      <template v-if="bossRows.length > 0">
        <h4>{{ t('dc.resources.bossRush') }}</h4>
        <el-table :data="bossRows" size="small" style="width: 100%">
          <el-table-column :label="t('dc.resources.field')" min-width="200">
            <template #default="{ row }">
              <div class="name-cell">
                <span>{{ bossLabel(row.field) }}</span>
                <span class="raw-id">{{ row.field }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="idx" :label="t('dc.resources.idx')" width="80" />
          <el-table-column :label="t('dc.resources.unlock')" width="110">
            <template #default="{ row }">
              <el-switch
                :model-value="row.unlock"
                @update:model-value="
                  (v: boolean | string | number) => toggleBoss(row.field, row.idx, v)
                "
              />
            </template>
          </el-table-column>
        </el-table>
      </template>
    </template>
  </div>
</template>

<style scoped>
.dc-resources h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.name-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.raw-id {
  font-size: 11px;
  opacity: 0.45;
}
.dc-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
