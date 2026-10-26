<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { locale, t } from '@host/i18n'
import { arcanaCatalog, lookupArcanaName } from '../catalog/arcana'
import { mercyTasks, mercyTalents } from '../catalog/mercy'
import { featureFlags } from '../model/featureFlags'
import { completeAllMercy, unlockAllArcana } from '../model/arcana'
import { useBcEditor } from './inject'

interface ArcanaRow {
  arcanaNumber: number
  name: string
  characterGuid: string
  spellItemID: string
  unlocked: boolean
}

const editor = useBcEditor()
const writable = featureFlags.addTarot

const loc = computed((): 'zh' | 'en' => (locale.value === 'en' ? 'en' : 'zh'))

const unlockedGuids = computed(() => {
  void editor.rev
  return new Set(editor.save.player.arcanaCharacterGuids)
})

const completedTasks = computed(() => {
  void editor.rev
  return new Set(editor.save.player.arcanaCompletedTasks)
})

const unlockedTalents = computed(() => {
  void editor.rev
  return new Set(editor.save.player.arcanaUnlockedTalents)
})

const arcanaRows = computed((): ArcanaRow[] => {
  void editor.rev
  return arcanaCatalog().map((a) => ({
    arcanaNumber: a.arcanaNumber,
    name: lookupArcanaName(a, loc.value),
    characterGuid: a.characterGuid,
    spellItemID: a.spellItemID,
    unlocked: unlockedGuids.value.has(a.characterGuid)
  }))
})

const taskDoneCount = computed(() => {
  void editor.rev
  let n = 0
  for (const t of mercyTasks()) {
    if (completedTasks.value.has(t.guid)) n += 1
  }
  return n
})

const talentDoneCount = computed(() => {
  void editor.rev
  let n = 0
  for (const t of mercyTalents()) {
    if (unlockedTalents.value.has(t.guid)) n += 1
  }
  return n
})

const taskTotal = mercyTasks().length
const talentTotal = mercyTalents().length

function onUnlockArcana(): void {
  if (!writable) return
  let n = 0
  editor.markDirty(() => {
    n = unlockAllArcana(editor.save)
  })
  if (n > 0) ElMessage.success(t('bc.tarot.unlockedAll', String(n)))
  else ElMessage.info(t('bc.tarot.unlockedAllNone'))
}

function onCompleteMercy(): void {
  if (!writable) return
  let n = 0
  editor.markDirty(() => {
    n = completeAllMercy(editor.save)
  })
  if (n > 0) ElMessage.success(t('bc.tarot.mercyDone', String(n)))
  else ElMessage.info(t('bc.tarot.mercyDoneNone'))
}
</script>

<template>
  <div class="bc-tarot" :data-ss-rev="editor.rev">
    <p class="hint">{{ t('bc.tarot.hint') }}</p>
    <p v-if="!writable" class="hint">{{ t('bc.tarot.needCatalog') }}</p>

    <h3 class="section">{{ t('bc.tarot.cards') }}</h3>
    <div v-if="writable" class="actions">
      <el-button type="primary" @click="onUnlockArcana">{{ t('bc.tarot.unlockAll') }}</el-button>
    </div>
    <el-table :data="arcanaRows" size="small" row-key="characterGuid" style="width: 100%">
      <el-table-column :label="t('bc.tarot.colNum')" prop="arcanaNumber" width="64" />
      <el-table-column :label="t('bc.tarot.colName')" prop="name" min-width="120" />
      <el-table-column :label="t('bc.tarot.colSpell')" prop="spellItemID" min-width="140" />
      <el-table-column :label="t('bc.tarot.colStatus')" width="100">
        <template #default="{ row }">
          {{ row.unlocked ? t('bc.tarot.statusOn') : t('bc.tarot.statusOff') }}
        </template>
      </el-table-column>
    </el-table>

    <h3 class="section">{{ t('bc.tarot.mercy') }}</h3>
    <p class="hint">
      {{ t('bc.tarot.mercyProgress', String(taskDoneCount), String(taskTotal), String(talentDoneCount), String(talentTotal)) }}
    </p>
    <div v-if="writable" class="actions">
      <el-button type="primary" @click="onCompleteMercy">{{ t('bc.tarot.completeMercy') }}</el-button>
    </div>
  </div>
</template>

<style scoped>
.section {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.section:first-of-type {
  margin-top: 8px;
}
.actions {
  margin-bottom: 8px;
}
.hint {
  margin: 0 0 8px;
  font-size: 12px;
  opacity: 0.7;
}
</style>
