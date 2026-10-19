<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { useBcEditor } from './inject'

interface GuidRow {
  index: number
  id: string
}

function guidRows(list: string[]): GuidRow[] {
  return list.map((id, index) => ({ index, id }))
}

const editor = useBcEditor()

const vaniaMoves = computed(() => {
  void editor.rev
  return guidRows(editor.save.player.vaniaMoves)
})
const progression = computed(() => {
  void editor.rev
  return guidRows(editor.save.player.progressionPersistentSave)
})
const arcanaTasks = computed(() => {
  void editor.rev
  return guidRows(editor.save.player.arcanaCompletedTasks)
})
const arcanaTalents = computed(() => {
  void editor.rev
  return guidRows(editor.save.player.arcanaUnlockedTalents)
})
</script>

<template>
  <div class="bc-abilities" :data-ss-rev="editor.rev">
    <h3 class="section">{{ t('bc.abilities.vaniaMoves') }}</h3>
    <p v-if="vaniaMoves.length === 0" class="empty">{{ t('bc.abilities.empty') }}</p>
    <el-table v-else :data="vaniaMoves" size="small" row-key="index" style="width: 100%">
      <el-table-column :label="t('bc.abilities.colId')" prop="id" />
    </el-table>

    <h3 class="section">{{ t('bc.abilities.progression') }}</h3>
    <p v-if="progression.length === 0" class="empty">{{ t('bc.abilities.empty') }}</p>
    <el-table v-else :data="progression" size="small" row-key="index" style="width: 100%">
      <el-table-column :label="t('bc.abilities.colId')" prop="id" />
    </el-table>

    <h3 class="section">{{ t('bc.abilities.arcanaTasks') }}</h3>
    <p v-if="arcanaTasks.length === 0" class="empty">{{ t('bc.abilities.empty') }}</p>
    <el-table v-else :data="arcanaTasks" size="small" row-key="index" style="width: 100%">
      <el-table-column :label="t('bc.abilities.colId')" prop="id" />
    </el-table>

    <h3 class="section">{{ t('bc.abilities.arcanaTalents') }}</h3>
    <p v-if="arcanaTalents.length === 0" class="empty">{{ t('bc.abilities.empty') }}</p>
    <el-table v-else :data="arcanaTalents" size="small" row-key="index" style="width: 100%">
      <el-table-column :label="t('bc.abilities.colId')" prop="id" />
    </el-table>

    <p class="hint">{{ t('bc.abilities.readonlyHint') }}</p>
  </div>
</template>

<style scoped>
.section {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.section:first-child {
  margin-top: 0;
}
.empty,
.hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
.hint {
  margin-top: 12px;
}
</style>
