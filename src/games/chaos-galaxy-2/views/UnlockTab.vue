<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { setScalar } from '../model/es3-binary'
import { factionLabel, gameData } from '../model/gameData'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

interface UnlockRow {
  index: number
  key: string
  label: string
  hint: string
  on: boolean
  kind: 'bool' | 'int'
}

/** Map raw save suffixes to player-facing copy. */
const UNLOCK_COPY: Record<string, { labelKey: string; hintKey: string }> = {
  AlienUnlocked: { labelKey: 'unlock.alienLabel', hintKey: 'unlock.alienHint' }
}

const editor = useCg2Editor()

const playFaction = computed(() => {
  void editor.rev
  try {
    return editor.save.getPlayFaction()
  } catch {
    return 0
  }
})

const playFactionLabel = computed(() =>
  factionLabel(gameData, playFaction.value, t('resources.factionFallback'))
)

function unlockDisplay(suffix: string): { label: string; hint: string } {
  const mapped = UNLOCK_COPY[suffix]
  if (mapped) return { label: t(mapped.labelKey), hint: t(mapped.hintKey) }
  return { label: suffix, hint: t('unlock.genericHint', suffix) }
}

const unlocks = computed((): UnlockRow[] => {
  void editor.rev
  const faction = playFaction.value
  const re = new RegExp(`^Faction${faction}(?!\\d).*Unlocked`)
  const rows: UnlockRow[] = []
  for (const entry of editor.save.entries) {
    if (!re.test(entry.key)) continue
    if (entry.kind !== 'bool' && entry.kind !== 'int') continue
    const suffix = entry.key.replace(`Faction${faction}`, '')
    const display = unlockDisplay(suffix)
    rows.push({
      index: rows.length,
      key: entry.key,
      label: display.label,
      hint: display.hint,
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
    <el-alert
      type="info"
      show-icon
      :closable="false"
      :title="t('unlock.hint')"
      class="hint"
    />
    <div class="toolbar">
      <el-button type="primary" @click="unlockAll()">{{ t('unlock.unlockAll') }}</el-button>
      <span class="faction">{{ playFactionLabel }}</span>
      <span class="count">{{ t('unlock.count', unlockedCount, unlocks.length) }}</span>
    </div>
    <p v-if="unlocks.length === 0" class="empty">{{ t('unlock.empty') }}</p>
    <div v-else class="list">
      <label v-for="row in unlocks" :key="row.key" class="item">
        <el-checkbox
          :model-value="row.on"
          @change="(on) => toggle(row, on)"
        >
          {{ row.label }}
        </el-checkbox>
        <span class="item-hint">{{ row.hint }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.hint { margin-bottom: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.faction { color: #606266; font-size: 13px; }
.count { color: #909399; }
.empty { color: #909399; }
.list { display: flex; flex-direction: column; gap: 12px; }
.item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin: 0;
}
.item-hint {
  margin-left: 24px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
  max-width: 42em;
}
</style>
