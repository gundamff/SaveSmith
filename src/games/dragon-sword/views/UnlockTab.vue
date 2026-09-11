<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { locale } from '@host/i18n'
import { t } from '../i18n'
import { characterCatalog, isEarnableCharacter } from '../model/characters'
import { setTitleKnown, titleCatalog, titleKnown } from '../model/titles'
import { useDsEditor } from './inject'

const MAX = 99_999_999

interface CharacterSnapshot {
  index: number
  characterCid: number
  level: number
  exp: number
  ascend: number
}

interface KarmaSnapshot {
  index: number
  itemCid: number
  exp: number
  ascend: number
  transcend: number
  isLock: number
}

const editor = useDsEditor()
const typedTitle = ref(0)

const characterRows = computed((): CharacterSnapshot[] => {
  void editor.rev
  return editor.save.characters.map((row, index) => ({
    index,
    characterCid: row.characterCid,
    level: row.level,
    exp: row.exp,
    ascend: row.ascend
  }))
})

const ownedCids = computed(() => {
  void editor.rev
  return new Set(editor.save.characters.map((row) => row.characterCid))
})

const earnableRows = computed(() => {
  void editor.rev
  const loc = locale.value === 'en' ? 'en' : 'zh'
  return characterCatalog
    .filter((row) => isEarnableCharacter(row.characterCid))
    .map((row) => ({
      characterCid: row.characterCid,
      label: row.name[loc] || row.name.zh || `#${row.characterCid}`,
      owned: ownedCids.value.has(row.characterCid)
    }))
})

const titleRows = computed(() => {
  void editor.rev
  const loc = locale.value === 'en' ? 'en' : 'zh'
  return titleCatalog.map((title) => ({
    titleId: title.titleId,
    label: title.name[loc] || title.name.zh || `#${title.titleId}`,
    known: titleKnown(editor.save.titles, title.titleId)
  }))
})

const karmaRows = computed((): KarmaSnapshot[] => {
  void editor.rev
  return editor.save.karma.flatMap((row, index) => {
    if (row.deletedDate !== 0) return []
    return [
      {
        index,
        itemCid: row.itemCid,
        exp: row.exp,
        ascend: row.ascend,
        transcend: row.transcend,
        isLock: row.isLock
      }
    ]
  })
})

function setTypedTitle(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  typedTitle.value = Math.max(0, Math.floor(v))
}

function applyTypedTitle(known: boolean): void {
  const titleId = typedTitle.value
  if (!Number.isFinite(titleId) || titleId <= 0) return
  editor.markDirty(() => {
    setTitleKnown(editor.save.titles, titleId, known)
  })
  ElMessage.success(known ? t('unlock.unlocked') : t('unlock.locked'))
}

function toggleTitle(titleId: number, known: boolean): void {
  editor.markDirty(() => {
    setTitleKnown(editor.save.titles, titleId, known)
  })
}

function changeCharacter(index: number, field: 'level' | 'exp' | 'ascend', v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.characters[index]
    if (!row) return
    row[field] = Math.max(0, Math.floor(v))
  })
}

function unlockCharacter(cid: number): void {
  if (!isEarnableCharacter(cid)) return
  editor.markDirty(() => {
    if (editor.save.characters.some((row) => row.characterCid === cid)) return
    editor.save.characters.push({ characterCid: cid, level: 1, exp: 0, ascend: 0 })
  })
}

function changeKarma(
  index: number,
  field: 'exp' | 'ascend' | 'transcend' | 'isLock',
  v: number | undefined
): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const row = editor.save.karma[index]
    if (!row) return
    row[field] = Math.max(0, Math.floor(v))
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <h4 class="section">{{ t('unlock.titles') }}</h4>
    <div class="toolbar">
      <span class="add-label">{{ t('unlock.titleId') }}</span>
      <el-input-number
        size="small"
        :model-value="typedTitle"
        :min="1"
        :max="MAX"
        controls-position="right"
        @update:model-value="(v) => setTypedTitle(v ?? undefined)"
      />
      <el-button type="primary" :disabled="typedTitle <= 0" @click="applyTypedTitle(true)">{{ t('unlock.unlock') }}</el-button>
      <el-button :disabled="typedTitle <= 0" @click="applyTypedTitle(false)">{{ t('unlock.lock') }}</el-button>
    </div>
    <p v-if="titleRows.length === 0" class="ds-empty">{{ t('unlock.emptyTitles') }}</p>
    <el-table v-else :data="titleRows" size="small" max-height="280" row-key="titleId">
      <el-table-column :label="t('unlock.titles')" min-width="160">
        <template #default="{ row }">{{ row.label }}</template>
      </el-table-column>
      <el-table-column :label="t('unlock.titleId')" width="140">
        <template #default="{ row }">{{ row.titleId }}</template>
      </el-table-column>
      <el-table-column :label="t('unlock.known')" width="90">
        <template #default="{ row }">
          <el-switch :model-value="row.known" @update:model-value="(v) => toggleTitle(row.titleId, Boolean(v))" />
        </template>
      </el-table-column>
    </el-table>

    <h4 class="section">{{ t('unlock.characters') }}</h4>
    <p v-if="earnableRows.length === 0" class="ds-empty">{{ t('unlock.catalogHint') }}</p>
    <el-table v-else :data="earnableRows" size="small" max-height="240" row-key="characterCid" class="gap">
      <el-table-column :label="t('unlock.characters')" min-width="160">
        <template #default="{ row }">{{ row.label }}</template>
      </el-table-column>
      <el-table-column :label="t('unlock.cid')" width="120">
        <template #default="{ row }">{{ row.characterCid }}</template>
      </el-table-column>
      <el-table-column :label="t('unlock.known')" width="120">
        <template #default="{ row }">
          <el-switch :model-value="row.owned" :disabled="row.owned" @update:model-value="(v) => v && unlockCharacter(row.characterCid)" />
        </template>
      </el-table-column>
    </el-table>
    <p v-if="characterRows.length === 0" class="ds-empty">{{ t('unlock.emptyCharacters') }}</p>
    <el-table v-else :data="characterRows" size="small" max-height="320" row-key="index" class="gap">
      <el-table-column :label="t('unlock.cid')" min-width="120">
        <template #default="{ row }">{{ row.characterCid }}</template>
      </el-table-column>
      <el-table-column :label="t('characters.level')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.level"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeCharacter(row.index, 'level', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('unlock.exp')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.exp"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeCharacter(row.index, 'exp', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('unlock.ascend')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.ascend"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeCharacter(row.index, 'ascend', v ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>

    <h4 class="section">{{ t('unlock.karma') }}</h4>
    <p v-if="karmaRows.length === 0" class="ds-empty">{{ t('unlock.emptyKarma') }}</p>
    <el-table v-else :data="karmaRows" size="small" max-height="360" row-key="index">
      <el-table-column :label="t('unlock.cid')" min-width="120">
        <template #default="{ row }">{{ row.itemCid }}</template>
      </el-table-column>
      <el-table-column :label="t('unlock.exp')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.exp"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeKarma(row.index, 'exp', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('unlock.ascend')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.ascend"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeKarma(row.index, 'ascend', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('unlock.transcend')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.transcend"
            :min="0"
            :max="MAX"
            controls-position="right"
            @update:model-value="(v) => changeKarma(row.index, 'transcend', v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('unlock.isLock')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.isLock"
            :min="0"
            :max="1"
            controls-position="right"
            @update:model-value="(v) => changeKarma(row.index, 'isLock', v ?? undefined)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.add-label {
  opacity: 0.8;
  font-size: 13px;
}
.section {
  margin: 16px 0 8px;
  font-size: 14px;
}
.section:first-child {
  margin-top: 0;
}
.ds-empty {
  opacity: 0.7;
  margin: 0 0 8px;
}
.gap {
  margin-bottom: 12px;
}
</style>
