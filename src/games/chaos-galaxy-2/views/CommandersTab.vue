<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getEntry } from '../model/es3-binary'
import { commanderById, gameData } from '../model/gameData'
import { gameImage } from '../lib/images'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

interface CommanderTableRow {
  index: number
  id: number
  name: string
  portrait: string
  exp: number
  admin: number
  military: number
  intellect: number
  breeding: number
  star: number
  skills: number[]
}

const editor = useCg2Editor()
const maxSkillId = Math.max(
  0,
  ...gameData.talents.map((x) => x.id),
  ...gameData.strategies.map((x) => x.id),
  ...gameData.tactics.map((x) => x.id)
)

const commanders = computed((): CommanderTableRow[] => {
  void editor.rev
  return editor.save.listCommanderIds().map((id, index) => {
    const row = editor.save.getCommander(id)
    const entry = commanderById(gameData, id)
    return {
      index,
      id,
      name: entry?.name || t('commanders.nameFallback', id),
      portrait: gameImage(`portrait-${entry?.portrait ?? id}`),
      exp: row.exp,
      admin: row.admin,
      military: row.military,
      intellect: row.intellect,
      breeding: row.breeding,
      star: row.star,
      skills: row.skills.slice()
    }
  })
})

function hasField(id: number, suffix: string): boolean {
  return !!getEntry(editor.save.entries, `Commander${id}${suffix}`)
}

function setNum(id: number, suffix: string, field: 'exp' | 'admin' | 'military' | 'intellect' | 'breeding' | 'star', v: number | undefined): void {
  if (v === undefined || Number.isNaN(v) || !hasField(id, suffix)) return
  editor.markDirty(() => editor.save.setCommander(id, { [field]: v }))
}

function setSkill(id: number, skillIndex: number, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  const skills = editor.save.getCommander(id).skills.slice()
  if (skillIndex < 0 || skillIndex >= skills.length) return
  skills[skillIndex] = v
  editor.markDirty(() => editor.save.setCommander(id, { skills }))
}

function maxAll(): void {
  let n = 0
  editor.markDirty(() => {
    for (const id of editor.save.listCommanderIds()) {
      const patch: { exp: number; admin?: number; military?: number; intellect?: number; breeding?: number; star?: number } = {
        exp: gameData.commanderMaxExp
      }
      if (hasField(id, 'Admin')) patch.admin = gameData.commanderMaxStat
      if (hasField(id, 'Military')) patch.military = gameData.commanderMaxStat
      if (hasField(id, 'Intellect')) patch.intellect = gameData.commanderMaxStat
      if (hasField(id, 'Breeding')) patch.breeding = gameData.commanderMaxStat
      if (hasField(id, 'Star')) patch.star = gameData.commanderMaxStar
      editor.save.setCommander(id, patch)
      n++
    }
  })
  ElMessage.success(t('commanders.maxed', n))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('commanders.maxAll') }}</el-button>
      <span class="count">{{ t('commanders.count', commanders.length) }}</span>
    </div>
    <el-table :data="commanders" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('commanders.name')" min-width="140">
        <template #default="{ row }">
          <div class="name-cell">
            <img v-if="row.portrait" :src="row.portrait" class="avatar" alt="" />
            <span>{{ row.name }}</span>
            <span class="id">#{{ row.id }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.exp')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.exp"
            :min="0"
            :max="gameData.commanderMaxExp"
            :step="100"
            controls-position="right"
            @update:model-value="(v) => setNum(row.id, 'Exp', 'exp', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.admin')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.admin"
            :min="0"
            :max="gameData.commanderMaxStat"
            controls-position="right"
            @update:model-value="(v) => setNum(row.id, 'Admin', 'admin', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.military')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.military"
            :min="0"
            :max="gameData.commanderMaxStat"
            controls-position="right"
            @update:model-value="(v) => setNum(row.id, 'Military', 'military', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.intellect')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.intellect"
            :min="0"
            :max="gameData.commanderMaxStat"
            controls-position="right"
            @update:model-value="(v) => setNum(row.id, 'Intellect', 'intellect', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.breeding')" width="140">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.breeding"
            :min="0"
            :max="gameData.commanderMaxStat"
            controls-position="right"
            @update:model-value="(v) => setNum(row.id, 'Breeding', 'breeding', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.star')" width="120">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.star"
            :min="0"
            :max="gameData.commanderMaxStar"
            controls-position="right"
            @update:model-value="(v) => setNum(row.id, 'Star', 'star', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.skills')" min-width="280">
        <template #default="{ row }">
          <div class="skills">
            <el-input-number
              v-for="(sk, si) in row.skills"
              :key="si"
              size="small"
              :model-value="sk"
              :min="0"
              :max="maxSkillId"
              controls-position="right"
              @update:model-value="(v) => setSkill(row.id, Number(si), v ?? undefined)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.count { color: #909399; }
.name-cell { display: flex; align-items: center; gap: 8px; }
.avatar { width: 28px; height: 28px; image-rendering: pixelated; }
.id { color: #909399; font-size: 12px; }
.skills { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
