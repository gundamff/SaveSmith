<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getEntry } from '../model/es3-binary'
import {
  chipSkillById,
  chipSkillOptions,
  commanderById,
  factionLabel,
  gameData
} from '../model/gameData'
import { gameImage } from '../lib/images'
import { t } from '../i18n'
import { useDeferredReady } from './deferredReady'
import { useCg2Editor } from './inject'

interface CommanderTableRow {
  index: number
  id: number
  name: string
  portrait: string
  faction: number | null
  factionName: string
  exp: number
  admin: number
  military: number
  intellect: number
  breeding: number
  star: number
  skills: number[]
  talentName: string
  strategyName: string
  tacticsName: string
}

const editor = useCg2Editor()
const PAGE_SIZE = 20
const page = ref(1)
const filterMode = ref<'mine' | 'all'>('mine')
const search = ref('')
const { loading, ready } = useDeferredReady([filterMode])

const chipOptions = chipSkillOptions(gameData).map((o) =>
  o.value === 0 ? { ...o, label: t('commanders.none') } : o
)
/** Only mount full chip lists while a dropdown is open — avoids OOM with many commanders. */
const openChipKey = ref<string | null>(null)

function catalogName(
  list: { id: number; name: string }[],
  id: number | undefined
): string {
  if (!id) return t('commanders.none')
  return list.find((x) => x.id === id)?.name || `#${id}`
}

function chipVisibleOptions(key: string, selected: number): { value: number; label: string }[] {
  if (openChipKey.value === key) return chipOptions
  const hit = chipOptions.find((o) => o.value === selected)
  if (hit) return [hit]
  if (selected === 0) return [chipOptions[0]!]
  const name = chipSkillById(gameData, selected)?.name
  return [{ value: selected, label: name ? `${name} (#${selected})` : `#${selected}` }]
}

function onChipVisible(key: string, open: boolean): void {
  openChipKey.value = open ? key : null
}

const playFaction = computed(() => {
  void editor.rev
  try {
    return editor.save.getPlayFaction()
  } catch {
    return -1
  }
})

const factionByCommander = computed(() => {
  void editor.rev
  return editor.save.getCommanderFactionMap(playFaction.value)
})

const filteredCommanderIds = computed((): number[] => {
  void editor.rev
  if (!ready.value) return []
  const play = playFaction.value
  const facMap = factionByCommander.value
  const q = search.value.trim().toLowerCase()
  const ids = editor.save.listCommanderIds()
  return ids.filter((id) => {
    const faction = facMap.get(id)
    if (filterMode.value === 'mine') {
      if (faction !== play) return false
    }
    if (!q) return true
    const entry = commanderById(gameData, id)
    const name = (entry?.name || t('commanders.nameFallback', id)).toLowerCase()
    return name.includes(q) || String(id).includes(q)
  })
})

const commanderCount = computed(() => filteredCommanderIds.value.length)

const pageCount = computed(() => Math.max(1, Math.ceil(commanderCount.value / PAGE_SIZE)))

const pagedCommanders = computed((): CommanderTableRow[] => {
  if (!ready.value) return []
  const ids = filteredCommanderIds.value
  const facMap = factionByCommander.value
  const start = (page.value - 1) * PAGE_SIZE
  return ids.slice(start, start + PAGE_SIZE).map((id, offset) => {
    const index = start + offset
    const row = editor.save.getCommander(id)
    const entry = commanderById(gameData, id)
    const faction = facMap.get(id) ?? null
    return {
      index,
      id,
      name: entry?.name || t('commanders.nameFallback', id),
      portrait: gameImage(`portrait-${entry?.portrait ?? id}`),
      faction,
      factionName:
        faction === null
          ? t('commanders.factionUnknown')
          : factionLabel(gameData, faction, t('resources.factionFallback')),
      exp: row.exp,
      admin: row.admin,
      military: row.military,
      intellect: row.intellect,
      breeding: row.breeding,
      star: row.star,
      skills: row.skills.slice(),
      talentName: catalogName(gameData.talents, entry?.talent),
      strategyName: catalogName(gameData.strategies, entry?.strategy),
      tacticsName: catalogName(gameData.tactics, entry?.tactics)
    }
  })
})

watch([filterMode, search], () => {
  page.value = 1
  openChipKey.value = null
})

watch(commanderCount, (n) => {
  const maxPage = Math.max(1, Math.ceil(n / PAGE_SIZE))
  if (page.value > maxPage) page.value = maxPage
})

watch(page, () => {
  openChipKey.value = null
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

function mineCommanderIds(): number[] {
  const play = playFaction.value
  const facMap = editor.save.getCommanderFactionMap(play)
  return editor.save.listCommanderIds().filter((id) => facMap.get(id) === play)
}

function maxMine(): void {
  let n = 0
  editor.markDirty(() => {
    for (const id of mineCommanderIds()) {
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
  ElMessage.success(t('commanders.maxedMine', n))
}
</script>

<template>
  <div
    v-loading="loading"
    class="panel"
    :element-loading-text="t('common.loading')"
    :data-ss-rev="editor.rev"
  >
    <div class="toolbar">
      <el-button type="primary" :disabled="loading" @click="maxMine()">{{ t('commanders.maxAllMine') }}</el-button>
      <el-radio-group v-model="filterMode" size="small" :disabled="loading">
        <el-radio-button value="mine">{{ t('commanders.filterMine') }}</el-radio-button>
        <el-radio-button value="all">{{ t('commanders.filterAll') }}</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="search"
        size="small"
        clearable
        class="search"
        :placeholder="t('commanders.searchPlaceholder')"
        :disabled="loading"
      />
      <span class="count">{{ t('commanders.count', commanderCount) }}</span>
    </div>
    <el-alert type="info" show-icon :closable="false" :title="t('commanders.skillsHint')" class="hint" />
    <el-alert type="info" show-icon :closable="false" :title="t('commanders.factionHint')" class="hint" />
    <el-table v-if="ready" :data="pagedCommanders" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('commanders.name')" min-width="140">
        <template #default="{ row }">
          <div class="name-cell">
            <img v-if="row.portrait" :src="row.portrait" class="avatar" alt="" />
            <span>{{ row.name }}</span>
            <span class="id">#{{ row.id }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('commanders.faction')" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.factionName }}</template>
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
      <el-table-column :label="t('commanders.talent')" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.talentName }}</template>
      </el-table-column>
      <el-table-column :label="t('commanders.strategy')" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.strategyName }}</template>
      </el-table-column>
      <el-table-column :label="t('commanders.tactics')" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.tacticsName }}</template>
      </el-table-column>
      <el-table-column :label="t('commanders.skills')" min-width="360">
        <template #default="{ row }">
          <div class="skills">
            <div v-for="(sk, si) in row.skills" :key="si" class="skill-item">
              <span class="skill-label">{{ t('commanders.skillSlot', Number(si) + 1) }}</span>
              <el-select
                size="small"
                filterable
                :model-value="sk"
                style="width: 160px"
                @visible-change="(open: boolean) => onChipVisible(`c${row.id}-${si}`, open)"
                @update:model-value="(v) => setSkill(row.id, Number(si), v ?? undefined)"
              >
                <el-option
                  v-for="o in chipVisibleOptions(`c${row.id}-${si}`, sk)"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="placeholder" aria-hidden="true" />
    <div v-if="ready && commanderCount > PAGE_SIZE" class="pager">
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next"
        :page-size="PAGE_SIZE"
        :total="commanderCount"
        :pager-count="5"
        small
        background
      />
      <span class="page-hint">{{ t('commanders.page', page, pageCount) }}</span>
    </div>
  </div>
</template>

<style scoped>
.panel { min-height: 240px; }
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.search { width: 200px; }
.hint { margin-bottom: 12px; }
.count { color: #909399; }
.name-cell { display: flex; align-items: center; gap: 8px; }
.avatar { width: 28px; height: 28px; image-rendering: pixelated; }
.id { color: #909399; font-size: 12px; }
.skills { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-item { display: flex; align-items: center; gap: 4px; }
.skill-label { color: #606266; font-size: 12px; white-space: nowrap; }
.placeholder { min-height: 200px; }
.pager { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
.page-hint { color: #909399; font-size: 12px; }
</style>
