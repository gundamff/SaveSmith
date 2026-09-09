<script setup lang="ts">
import { computed } from 'vue'
import { gameData } from '../model/gameData'
import { t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const save = computed(() => editor.save)
const MAX_REL = 999

function wrap(fn: () => void): void {
  editor.markDirty(fn)
}
function changeNum(apply: (v: number) => void): (v: number | undefined) => void {
  return (v) => {
    if (v === undefined) return
    wrap(() => apply(v))
  }
}
function maxResources(): void {
  wrap(() => {
    save.value!.setCredit(99_999_999)
    save.value!.setPrestige(99_999)
    save.value!.setStar(6)
  })
}
function medalLabel(i: number): string {
  const name = save.value!.factionLabel(gameData, i)
  return t('resources.medal', name)
}
function relLabel(i: number): string {
  const name = save.value!.factionLabel(gameData, i)
  return t('resources.relationship', name)
}
</script>

<template>
  <div v-if="save">
    <el-alert type="warning" show-icon :closable="false" :title="t('resources.relWarn')" class="warn" />
    <el-form label-width="220px" style="max-width: 640px">
      <el-form-item :label="t('resources.credit')"><el-input-number :model-value="save.credit" :min="0" :max="999999999" :step="10000" @change="changeNum((v) => save!.setCredit(v))" /></el-form-item>
      <el-form-item :label="t('resources.prestige')"><el-input-number :model-value="save.prestige" :min="0" :max="999999" :step="100" @change="changeNum((v) => save!.setPrestige(v))" /></el-form-item>
      <el-form-item :label="t('resources.star')"><el-input-number :model-value="save.star" :min="1" :max="6" @change="changeNum((v) => save!.setStar(v))" /></el-form-item>
      <el-form-item v-for="i in 4" :key="'medal' + i" :label="medalLabel(i - 1)">
        <el-input-number :model-value="save.medals[i - 1]" :min="0" :max="99999" @change="changeNum((v) => save!.setMedal(i - 1, v))" />
      </el-form-item>
      <el-form-item v-for="i in 4" :key="'rel' + i" :label="relLabel(i - 1)">
        <el-input-number :model-value="save.relationships[i - 1]" :min="0" :max="MAX_REL" @change="changeNum((v) => save!.setRelationship(i - 1, v))" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="maxResources()">{{ t('resources.maxAll') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>.warn { margin-bottom: 16px; max-width: 640px; }</style>
