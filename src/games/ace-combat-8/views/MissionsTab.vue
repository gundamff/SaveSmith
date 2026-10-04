<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { CATALOG_MISSIONS, missionLabel } from '../model/catalog'
import {
  DIFFICULTY_NAMES,
  RANK_NAMES,
  readMissionRecords,
  setAllExistingMissionRanks,
  setMissionDifficultyRank,
  type MissionDifficultyView
} from '../model/missionRecords'
import { refreshView } from '../parse'
import { useAc8Editor } from './inject'

const editor = useAc8Editor()

const rows = computed(() => {
  void editor.rev
  const recs = new Map(readMissionRecords(editor.save.patch.bytes).map((r) => [r.missionId, r]))
  const ids = new Set<number>([...CATALOG_MISSIONS.map((m) => m.id), ...recs.keys()])
  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => {
      const rec = recs.get(id)
      return {
        missionId: id,
        name: missionLabel(id),
        lastRank: rec?.lastRank ?? '',
        difficulties: rec?.difficulties ?? []
      }
    })
})

function rankAt(diffs: MissionDifficultyView[], level: number): string {
  return diffs.find((d) => d.level === level)?.rank ?? ''
}

function changeRank(missionId: number, level: number, rank: string | number | boolean): void {
  const r = String(rank)
  if (!r) return
  editor.markDirty(() => {
    setMissionDifficultyRank(editor.save.patch, missionId, level, r)
    refreshView(editor.save)
  })
}

function allS(): void {
  editor.markDirty(() => {
    setAllExistingMissionRanks(editor.save.patch, 'S')
    refreshView(editor.save)
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p class="hint">{{ t('ac8.missions.hint') }}</p>
    <el-button type="primary" class="all-s" @click="allS">{{ t('ac8.missions.allS') }}</el-button>
    <el-table :data="rows" height="560" stripe>
      <el-table-column prop="missionId" :label="t('ac8.missions.id')" width="70" />
      <el-table-column prop="name" :label="t('ac8.lists.name')" min-width="220" />
      <el-table-column prop="lastRank" :label="t('ac8.missions.lastRank')" width="100" />
      <el-table-column v-for="lvl in [1, 2, 3, 4, 5]" :key="lvl" :label="DIFFICULTY_NAMES[lvl]" min-width="110">
        <template #default="{ row }">
          <el-select
            v-if="rankAt(row.difficulties, lvl)"
            :model-value="rankAt(row.difficulties, lvl)"
            size="small"
            @change="(v: string | number | boolean) => changeRank(row.missionId, lvl, v)"
          >
            <el-option v-for="r in RANK_NAMES" :key="r" :label="r" :value="r" />
          </el-select>
          <span v-else class="muted">{{ t('ac8.missions.noRecord') }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.hint {
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
}
.all-s {
  margin-bottom: 12px;
}
.muted {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>
