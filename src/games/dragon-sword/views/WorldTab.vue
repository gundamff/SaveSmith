<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { useDsEditor } from './inject'

const MAX = 99_999_999

interface UserSnapshot {
  regionCid: number
  sectionUid: string
  posX: number
  posY: number
  posZ: number
}

const editor = useDsEditor()

const snap = computed((): UserSnapshot => {
  void editor.rev
  const user = editor.save.user
  return {
    regionCid: user.regionCid,
    sectionUid: user.sectionUid,
    posX: user.posX,
    posY: user.posY,
    posZ: user.posZ
  }
})

function changeRegion(v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    editor.save.user.regionCid = Math.max(0, Math.floor(v))
  })
}

function changeSection(v: string): void {
  editor.markDirty(() => {
    editor.save.user.sectionUid = v.trim() === '' ? '0' : v.trim()
  })
}

function changePos(field: 'posX' | 'posY' | 'posZ', v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    editor.save.user[field] = v
  })
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="grid">
      <label class="field">
        <span>{{ t('world.region') }}</span>
        <el-input-number
          size="small"
          :model-value="snap.regionCid"
          :min="0"
          :max="MAX"
          controls-position="right"
          @update:model-value="(v) => changeRegion(v ?? undefined)"
        />
      </label>
      <label class="field">
        <span>{{ t('world.section') }}</span>
        <el-input
          size="small"
          :model-value="snap.sectionUid"
          @update:model-value="(v) => changeSection(String(v ?? ''))"
        />
      </label>
      <label class="field">
        <span>{{ t('world.posX') }}</span>
        <el-input-number
          size="small"
          :model-value="snap.posX"
          :min="-MAX"
          :max="MAX"
          controls-position="right"
          @update:model-value="(v) => changePos('posX', v ?? undefined)"
        />
      </label>
      <label class="field">
        <span>{{ t('world.posY') }}</span>
        <el-input-number
          size="small"
          :model-value="snap.posY"
          :min="-MAX"
          :max="MAX"
          controls-position="right"
          @update:model-value="(v) => changePos('posY', v ?? undefined)"
        />
      </label>
      <label class="field">
        <span>{{ t('world.posZ') }}</span>
        <el-input-number
          size="small"
          :model-value="snap.posZ"
          :min="-MAX"
          :max="MAX"
          controls-position="right"
          @update:model-value="(v) => changePos('posZ', v ?? undefined)"
        />
      </label>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  min-width: 160px;
}
</style>
