<script setup lang="ts">
import { computed } from 'vue'
import { catalogLabel } from '../catalog'
import { t } from '../i18n'
import { useDsEditor } from './inject'

interface TeamSnapshot {
  index: number
  pageId: number
  slot1: number
  slot2: number
  slot3: number
}

type SlotKey = 'slot1' | 'slot2' | 'slot3'

const editor = useDsEditor()
const rows = computed((): TeamSnapshot[] => {
  void editor.rev
  return editor.save.teams.map((row, index) => ({
    index,
    pageId: row.pageId,
    slot1: row.slot1,
    slot2: row.slot2,
    slot3: row.slot3
  }))
})

const characterCids = computed((): number[] => {
  void editor.rev
  return editor.save.characters.map((row) => row.characterCid)
})

function allowedTeamCid(cid: number): boolean {
  if (cid === 0) return true
  return editor.save.characters.some((row) => row.characterCid === cid)
}

function changeSlot(index: number, slot: SlotKey, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  const cid = Math.floor(v)
  if (!allowedTeamCid(cid)) return
  editor.markDirty(() => {
    const row = editor.save.teams[index]
    if (!row) return
    row[slot] = cid
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <p v-if="rows.length === 0" class="ds-empty">{{ t('team.empty') }}</p>
    <el-table v-else :data="rows" size="small" max-height="560" row-key="index">
      <el-table-column :label="t('team.page')" width="100">
        <template #default="{ row }">{{ row.pageId }}</template>
      </el-table-column>
      <el-table-column v-for="slot in (['slot1', 'slot2', 'slot3'] as SlotKey[])" :key="slot" :label="t('team.slot')" min-width="160">
        <template #default="{ row }">
          <el-select
            size="small"
            :model-value="row[slot]"
            @update:model-value="(v) => changeSlot(row.index, slot, v as number | undefined)"
          >
            <el-option :value="0" :label="t('team.emptySlot')" />
            <el-option v-for="cid in characterCids" :key="cid" :value="cid" :label="catalogLabel(cid)" />
          </el-select>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.ds-empty {
  opacity: 0.7;
  margin: 0;
}
</style>
