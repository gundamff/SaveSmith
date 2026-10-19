<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { useBcEditor } from './inject'

const editor = useBcEditor()

const version = computed(() => {
  void editor.rev
  return editor.save.player.version
})
const saveDate = computed(() => {
  void editor.rev
  return editor.save.player.saveDate
})
const playTimeInSeconds = computed(() => {
  void editor.rev
  return editor.save.player.playTimeInSeconds
})
</script>

<template>
  <div class="bc-overview" :data-ss-rev="editor.rev">
    <el-descriptions :column="1" border>
      <el-descriptions-item :label="t('bc.overview.version')">{{ version }}</el-descriptions-item>
      <el-descriptions-item :label="t('bc.overview.saveDate')">{{ saveDate }}</el-descriptions-item>
      <el-descriptions-item :label="t('bc.overview.playTime')">
        {{ playTimeInSeconds }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<style scoped>
.bc-overview {
  max-width: 560px;
}
</style>
