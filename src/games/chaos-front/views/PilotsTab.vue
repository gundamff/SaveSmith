<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { characterById, gameData } from '../model/gameData'
import { CHARACTER_MAX_EXP, CHARACTER_MAX_LEVEL, characterLevelForExp } from '../model/level'
import type { PilotFactionRole, RecruitablePilot } from '../model/saveModel'
import { gameImage } from '../lib/images'
import { t, translateError } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const pilots = computed(() => {
  void editor.rev
  return (editor.save?.characters ?? []).map((id, index) => ({
    id,
    index,
    name: characterById(gameData, id)?.name ?? `#${id}`,
    exp: editor.save.characterExps[index] ?? 0
  }))
})

function levelOf(exp: number): number {
  return characterLevelForExp(exp)
}
function setExp(index: number, v: number | undefined): void {
  if (v === undefined || v === null) return
  editor.markDirty(() => editor.save.setPilotExp(index, v))
}
function maxAll(): void {
  let n = 0
  editor.markDirty(() => {
    n = editor.save.maxAllPilots()
  })
  ElMessage.success(t('pilots.maxed', n))
}

const addVisible = ref(false)
const addId = ref<number | null>(null)
const addLevel = ref(CHARACTER_MAX_LEVEL)

const recruitable = computed((): RecruitablePilot[] => {
  void editor.rev
  if (!editor.save) return []
  return editor.save.listRecruitablePilots(gameData)
})

function roleLabel(role: PilotFactionRole): string {
  if (role === 'leader') return t('pilots.roleLeader')
  if (role === 'spyMaster') return t('pilots.roleSpy')
  return t('pilots.roleCommander')
}

function optionLabel(p: RecruitablePilot): string {
  const name = characterById(gameData, p.characterId)?.name ?? `#${p.characterId}`
  return t('pilots.optionLabel', name, p.factionName, roleLabel(p.role))
}

function openAdd(): void {
  addId.value = null
  addLevel.value = CHARACTER_MAX_LEVEL
  addVisible.value = true
}

function confirmAdd(): void {
  if (!addId.value || !editor.save) return
  const id = addId.value
  const level = addLevel.value
  try {
    let got: RecruitablePilot | undefined
    editor.markDirty(() => {
      got = editor.save.addPilot(gameData, id, level)
    })
    if (got) {
      const name = characterById(gameData, got.characterId)?.name ?? `#${got.characterId}`
      ElMessage.success(t('pilots.added', name, got.factionName))
    }
    addVisible.value = false
  } catch (e) {
    ElMessage.error(translateError(e))
  }
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('pilots.maxAll') }}</el-button>
      <el-button @click="openAdd()">{{ t('pilots.add') }}</el-button>
      <span class="count">{{ t('pilots.count', pilots.length) }}</span>
    </div>
    <el-table :data="pilots" size="small" max-height="560">
      <el-table-column :label="t('pilots.portrait')" width="64">
        <template #default="{ row }">
          <img :src="gameImage(`portrait-${row.id}`)" class="avatar" />
        </template>
      </el-table-column>
      <el-table-column prop="name" :label="t('pilots.name')" min-width="120" />
      <el-table-column :label="t('pilots.level')" width="90">
        <template #default="{ row }"><el-tag>Lv{{ levelOf(row.exp) }}</el-tag></template>
      </el-table-column>
      <el-table-column :label="t('pilots.exp')" width="220">
        <template #default="{ row }">
          <el-input-number size="small" :model-value="row.exp" :min="0" :max="CHARACTER_MAX_EXP" :step="100" controls-position="right" @update:model-value="(v) => setExp(row.index, v ?? undefined)" />
        </template>
      </el-table-column>
      <el-table-column :label="t('pilots.progress')">
        <template #default="{ row }">
          <el-progress :percentage="Math.min(100, Math.round((row.exp / CHARACTER_MAX_EXP) * 100))" :stroke-width="10" />
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="addVisible" :title="t('pilots.addTitle')" width="560">
      <p class="hint">{{ t('pilots.addHint') }}</p>
      <el-form label-width="90px">
        <el-form-item :label="t('pilots.person')">
          <el-select
            v-model="addId"
            filterable
            :disabled="recruitable.length === 0"
            :placeholder="recruitable.length ? t('pilots.personPlaceholder') : t('pilots.emptyPool')"
            style="width: 100%"
          >
            <el-option
              v-for="p in recruitable"
              :key="p.characterId"
              :value="p.characterId"
              :label="optionLabel(p)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('pilots.initLevel')">
          <el-slider v-model="addLevel" :min="1" :max="10" show-stops style="width: 300px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">{{ t('pilots.cancel') }}</el-button>
        <el-button type="primary" :disabled="!addId" @click="confirmAdd()">{{
          t('pilots.confirmAdd')
        }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.count { color: #909399; }
.avatar { width: 36px; height: 36px; image-rendering: pixelated; }
.hint { color: #909399; font-size: 13px; line-height: 1.5; margin: 0 0 12px; }
</style>
