<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { locale, t } from '@host/i18n'
import { arcanaCatalog, lookupArcanaName } from '../catalog/arcana'
import { featureFlags } from '../model/featureFlags'
import { unlockAllArcana } from '../model/arcana'
import { useBcEditor } from './inject'

interface GuidRow {
  index: number
  id: string
}

interface ArcanaRow {
  arcanaNumber: number
  characterKey: string
  name: string
  characterGuid: string
  spellItemID: string
  unlocked: boolean
}

function guidRows(list: string[]): GuidRow[] {
  return list.map((id, index) => ({ index, id }))
}

const editor = useBcEditor()
const writable = featureFlags.addAbility

const loc = computed((): 'zh' | 'en' => (locale.value === 'en' ? 'en' : 'zh'))

const unlockedGuids = computed(() => {
  void editor.rev
  return new Set(editor.save.player.arcanaCharacterGuids)
})

const arcanaRows = computed((): ArcanaRow[] => {
  void editor.rev
  return arcanaCatalog().map((a) => ({
    arcanaNumber: a.arcanaNumber,
    characterKey: a.characterKey,
    name: lookupArcanaName(a, loc.value),
    characterGuid: a.characterGuid,
    spellItemID: a.spellItemID,
    unlocked: unlockedGuids.value.has(a.characterGuid)
  }))
})

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

function onUnlockAll(): void {
  if (!writable) return
  let n = 0
  editor.markDirty(() => {
    n = unlockAllArcana(editor.save)
  })
  if (n > 0) ElMessage.success(t('bc.abilities.unlockedAll', String(n)))
  else ElMessage.info(t('bc.abilities.unlockedAllNone'))
}
</script>

<template>
  <div class="bc-abilities" :data-ss-rev="editor.rev">
    <h3 class="section">{{ t('bc.abilities.tarot') }}</h3>
    <p class="hint">{{ t('bc.abilities.tarotHint') }}</p>
    <div v-if="writable" class="actions">
      <el-button type="primary" @click="onUnlockAll">{{ t('bc.abilities.unlockAll') }}</el-button>
    </div>
    <p v-else class="hint">{{ t('bc.abilities.needArcanaCatalog') }}</p>
    <el-table :data="arcanaRows" size="small" row-key="characterGuid" style="width: 100%">
      <el-table-column :label="t('bc.abilities.colNum')" prop="arcanaNumber" width="64" />
      <el-table-column :label="t('bc.abilities.colName')" prop="name" min-width="120" />
      <el-table-column :label="t('bc.abilities.colSpell')" prop="spellItemID" min-width="140" />
      <el-table-column :label="t('bc.abilities.colStatus')" width="100">
        <template #default="{ row }">
          {{ row.unlocked ? t('bc.abilities.statusOn') : t('bc.abilities.statusOff') }}
        </template>
      </el-table-column>
    </el-table>

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
.actions {
  margin-bottom: 8px;
}
.empty,
.hint {
  margin: 0 0 8px;
  font-size: 12px;
  opacity: 0.7;
}
</style>
