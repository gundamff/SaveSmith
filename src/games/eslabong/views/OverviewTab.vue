<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { writeClub } from '../model/club'
import { useEsEditor } from './inject'
import { useRevSyncedNumber } from './useRevSyncedNumber'

const editor = useEsEditor()

const writeEnabled = computed(() => {
  void editor.rev
  return editor.save.writeEnabled
})
const teamName = computed(() => {
  void editor.rev
  return String(editor.save.sidecar.team_name ?? '')
})
const season = computed(() => {
  void editor.rev
  return editor.save.sidecar.season
})
const week = computed(() => {
  void editor.rev
  return editor.save.sidecar.week
})
const savedAtText = computed(() => {
  void editor.rev
  const v = editor.save.sidecar.saved_at_text
  return typeof v === 'string' ? v : undefined
})
const gameDifficulty = computed(() => {
  void editor.rev
  const v = editor.save.sidecar.game_difficulty
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
})
const challengeTowerTeamSubmitted = computed(() => {
  void editor.rev
  const v = editor.save.sidecar.challenge_tower_team_submitted
  return typeof v === 'boolean' ? v : undefined
})

const { value: gold, onUpdate: onGold } = useRevSyncedNumber(
  editor,
  () => editor.save.club.gold,
  (s, n) => {
    s.club.gold = n
    s.sidecar.gold = n
    writeClub(s.resPlain, { gold: n })
  }
)
const { value: renown, onUpdate: onRenown } = useRevSyncedNumber(
  editor,
  () => editor.save.club.renown,
  (s, n) => {
    s.club.renown = n
    writeClub(s.resPlain, { renown: n })
    s.club.highestRenownReached = Math.max(s.club.highestRenownReached, n)
  }
)
const { value: developmentStars, onUpdate: onDevelopmentStars } = useRevSyncedNumber(
  editor,
  () => editor.save.club.developmentStars,
  (s, n) => {
    s.club.developmentStars = n
    writeClub(s.resPlain, { developmentStars: n })
  }
)
</script>

<template>
  <div class="es-overview" :data-ss-rev="editor.rev">
    <el-alert
      v-if="!writeEnabled"
      type="warning"
      :closable="false"
      show-icon
      :title="t('es.overview.writeDisabled')"
    />
    <el-alert
      v-else
      type="info"
      :closable="false"
      show-icon
      :title="t('es.overview.quitNotice')"
    />
    <el-form label-width="140px" class="es-form" :disabled="!writeEnabled">
      <el-form-item :label="t('es.overview.gold')">
        <el-input-number
          :model-value="gold"
          :min="0"
          :max="999999999"
          controls-position="right"
          @update:model-value="(v) => onGold(v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('es.overview.renown')">
        <el-input-number
          :model-value="renown"
          :min="0"
          :max="999999999"
          controls-position="right"
          @update:model-value="(v) => onRenown(v ?? undefined)"
        />
      </el-form-item>
      <el-form-item :label="t('es.overview.developmentStars')">
        <el-input-number
          :model-value="developmentStars"
          :min="0"
          :max="999999999"
          controls-position="right"
          @update:model-value="(v) => onDevelopmentStars(v ?? undefined)"
        />
      </el-form-item>
    </el-form>
    <el-descriptions :column="1" border class="es-desc">
      <el-descriptions-item :label="t('es.overview.teamName')">{{ teamName }}</el-descriptions-item>
      <el-descriptions-item :label="t('es.overview.season')">{{ season }}</el-descriptions-item>
      <el-descriptions-item :label="t('es.overview.week')">{{ week }}</el-descriptions-item>
      <el-descriptions-item v-if="savedAtText" :label="t('es.overview.savedAt')">
        {{ savedAtText }}
      </el-descriptions-item>
      <el-descriptions-item v-if="gameDifficulty !== undefined" :label="t('es.overview.difficulty')">
        {{ gameDifficulty }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="challengeTowerTeamSubmitted !== undefined"
        :label="t('es.overview.challengeTower')"
      >
        {{
          challengeTowerTeamSubmitted ? t('es.overview.yes') : t('es.overview.no')
        }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<style scoped>
.es-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 560px;
}
.es-form {
  max-width: 420px;
}
.es-desc {
  margin: 0;
}
</style>
