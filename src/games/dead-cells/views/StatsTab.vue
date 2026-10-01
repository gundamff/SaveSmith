<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import type { HxsDoc } from '../model/hxbit'
import {
  projectUser,
  setBossRushUnlock,
  setHeroHeadSkin,
  setHeroSkin,
  type BossRushRow,
  type StatRow
} from '../model/userModel'
import { useDcEditor } from './inject'

const editor = useDcEditor()
const view = computed(() => {
  void editor.rev
  return projectUser(editor.save.doc)
})
const rows = computed((): StatRow[] => view.value.stats.map((s) => ({ ...s })))
const bossRows = computed((): BossRushRow[] => view.value.bossRush.map((b) => ({ ...b })))

function changeSkin(setter: (doc: HxsDoc, v: string) => void, v: string): void {
  editor.markDirty(() => setter(editor.save.doc, v))
}

function toggleBoss(field: string, idx: number, v: boolean | string | number): void {
  editor.markDirty(() => setBossRushUnlock(editor.save.doc, field, idx, v === true))
}
</script>

<template>
  <div class="dc-stats" :data-ss-rev="editor.rev">
    <p v-if="!view.editable" class="dc-empty">{{ t('dc.stats.unreadable') }}</p>
    <template v-else>
      <el-form label-width="180px" style="max-width: 560px; margin-bottom: 16px">
        <el-form-item :label="t('dc.stats.heroSkin')">
          <el-input
            :model-value="view.heroSkin"
            style="max-width: 240px"
            @update:model-value="(v: string) => changeSkin(setHeroSkin, v)"
          />
        </el-form-item>
        <el-form-item :label="t('dc.stats.heroHeadSkin')">
          <el-input
            :model-value="view.heroHeadSkin"
            style="max-width: 240px"
            @update:model-value="(v: string) => changeSkin(setHeroHeadSkin, v)"
          />
        </el-form-item>
      </el-form>

      <h4>{{ t('dc.stats.counters') }}</h4>
      <el-table :data="rows" size="small" style="width: 100%; margin-bottom: 16px">
        <el-table-column prop="key" :label="t('dc.stats.field')" min-width="200" />
        <el-table-column prop="value" :label="t('dc.stats.value')" width="140" />
      </el-table>

      <template v-if="bossRows.length > 0">
        <h4>{{ t('dc.stats.bossRush') }}</h4>
        <el-table :data="bossRows" size="small" style="width: 100%">
          <el-table-column prop="field" :label="t('dc.stats.field')" min-width="200" />
          <el-table-column prop="idx" :label="t('dc.stats.idx')" width="80" />
          <el-table-column :label="t('dc.stats.unlock')" width="110">
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
.dc-stats h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.dc-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
