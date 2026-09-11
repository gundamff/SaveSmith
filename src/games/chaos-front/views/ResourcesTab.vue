<script setup lang="ts">
import { computed } from 'vue'
import { gameData } from '../model/gameData'
import { t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const MAX_REL = 999

const credit = computed(() => {
  void editor.rev
  return editor.save?.credit ?? 0
})
const prestige = computed(() => {
  void editor.rev
  return editor.save?.prestige ?? 0
})
const star = computed(() => {
  void editor.rev
  return editor.save?.star ?? 1
})
const medals = computed(() => {
  void editor.rev
  return editor.save?.medals.slice() ?? []
})
const relationships = computed(() => {
  void editor.rev
  return editor.save?.relationships.slice() ?? []
})

function wrap(fn: () => void): void {
  editor.markDirty(fn)
}
function changeNum(apply: (v: number) => void, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  wrap(() => apply(v))
}
function maxResources(): void {
  wrap(() => {
    editor.save.setCredit(99_999_999)
    editor.save.setPrestige(99_999)
    editor.save.setStar(6)
  })
}
function medalLabel(i: number): string {
  const name = editor.save.factionLabel(gameData, i)
  return t('resources.medal', name)
}
function relLabel(i: number): string {
  const name = editor.save.factionLabel(gameData, i)
  return t('resources.relationship', name)
}
</script>

<template>
  <div v-if="editor.save" :data-ss-rev="editor.rev">
    <el-alert type="warning" show-icon :closable="false" :title="t('resources.relWarn')" class="warn" />
    <el-form label-width="220px" style="max-width: 640px">
      <el-form-item :label="t('resources.credit')">
        <el-input-number
          :model-value="credit"
          :min="0"
          :max="999999999"
          :step="10000"
          @update:model-value="(v) => changeNum((n) => editor.save.setCredit(n), v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('resources.prestige')">
        <el-input-number
          :model-value="prestige"
          :min="0"
          :max="999999"
          :step="100"
          @update:model-value="(v) => changeNum((n) => editor.save.setPrestige(n), v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('resources.star')">
        <el-input-number
          :model-value="star"
          :min="1"
          :max="6"
          @update:model-value="(v) => changeNum((n) => editor.save.setStar(n), v ?? undefined)"
        />
      </el-form-item>
      <el-form-item v-for="i in 4" :key="'medal' + i" :label="medalLabel(i - 1)">
        <el-input-number
          :model-value="medals[i - 1]"
          :min="0"
          :max="99999"
          @update:model-value="(v) => changeNum((n) => editor.save.setMedal(i - 1, n), v ?? undefined)"
        />
      </el-form-item>
      <el-form-item v-for="i in 4" :key="'rel' + i" :label="relLabel(i - 1)">
        <el-input-number
          :model-value="relationships[i - 1]"
          :min="0"
          :max="MAX_REL"
          @update:model-value="(v) => changeNum((n) => editor.save.setRelationship(i - 1, n), v ?? undefined)"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="maxResources()">{{ t('resources.maxAll') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.warn {
  margin-bottom: 16px;
  max-width: 640px;
}
</style>
