<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { setScalar } from '../model/es3-binary'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

interface UnlockRow {
  index: number
  key: string
  label: string
  on: boolean
  kind: 'bool' | 'int'
}

const editor = useCg2Editor()

const unlocks = computed((): UnlockRow[] => {
  void editor.rev
  let faction = 0
  try {
    faction = editor.save.getPlayFaction()
  } catch {
    return []
  }
  const re = new RegExp(`^Faction${faction}(?!\\d).*Unlocked`)
  const rows: UnlockRow[] = []
  for (const entry of editor.save.entries) {
    if (!re.test(entry.key)) continue
    if (entry.kind !== 'bool' && entry.kind !== 'int') continue
    rows.push({
      index: rows.length,
      key: entry.key,
      label: entry.key.replace(`Faction${faction}`, ''),
      on: entry.kind === 'bool' ? Boolean(entry.value) : Number(entry.value) !== 0,
      kind: entry.kind
    })
  }
  return rows
})

const unlockedCount = computed(() => unlocks.value.filter((r) => r.on).length)

function toggle(row: UnlockRow, on: string | number | boolean): void {
  const enabled = on === true || on === row.key
  editor.markDirty(() => {
    setScalar(editor.save.entries, row.key, row.kind === 'bool' ? enabled : enabled ? 1 : 0)
  })
}

function unlockAll(): void {
  editor.markDirty(() => {
    let faction = 0
    try {
      faction = editor.save.getPlayFaction()
    } catch {
      return
    }
    editor.save.unlockAllKnown(faction)
  })
  ElMessage.success(t('unlock.unlockedAll'))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="unlockAll()">{{ t('unlock.unlockAll') }}</el-button>
      <span class="count">{{ t('unlock.count', unlockedCount, unlocks.length) }}</span>
    </div>
    <p v-if="unlocks.length === 0" class="empty">{{ t('unlock.empty') }}</p>
    <el-checkbox-group v-else :model-value="unlocks.filter((r) => r.on).map((r) => r.key)">
      <el-checkbox
        v-for="row in unlocks"
        :key="row.key"
        :value="row.key"
        :label="row.label"
        @change="(on) => toggle(row, on)"
      />
    </el-checkbox-group>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.count { color: #909399; }
.empty { color: #909399; }
</style>
