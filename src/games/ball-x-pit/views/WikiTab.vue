<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@host/i18n'
import { unlockWiki } from '../parse'
import { useBxpEditor } from './inject'

const editor = useBxpEditor()
const wiki = computed(() => {
  void editor.rev
  return editor.save.wiki
})

const complete = computed(() => {
  const w = wiki.value
  return (
    w.heroDiscovered === w.heroTotal &&
    w.passiveDiscovered === w.passiveTotal &&
    w.comboDiscovered === w.comboCells &&
    w.heroTotal > 0
  )
})

async function onUnlock(): Promise<void> {
  try {
    await ElMessageBox.confirm(t('bxp.wiki.unlockConfirm'), t('bxp.wiki.confirmTitle'), {
      confirmButtonText: t('bxp.wiki.confirm'),
      cancelButtonText: t('bxp.wiki.cancel'),
      type: 'warning'
    })
  } catch {
    return
  }
  editor.markDirty(() => {
    const n = unlockWiki(editor.save)
    ElMessage.success(t('bxp.wiki.unlocked', String(n)))
  })
}
</script>

<template>
  <div class="bxp-wiki" :data-ss-rev="editor.rev">
    <p class="bxp-risk">{{ t('bxp.wiki.risk') }}</p>
    <p class="bxp-progress">
      {{
        t(
          'bxp.wiki.progress',
          String(wiki.heroDiscovered),
          String(wiki.heroTotal),
          String(wiki.passiveDiscovered),
          String(wiki.passiveTotal),
          String(wiki.comboDiscovered),
          String(wiki.comboCells)
        )
      }}
    </p>
    <el-button type="primary" :disabled="complete" @click="onUnlock">
      {{ t('bxp.wiki.unlockAll') }}
    </el-button>
  </div>
</template>

<style scoped>
.bxp-risk {
  color: var(--el-color-warning);
  margin: 0 0 12px;
  max-width: 560px;
  line-height: 1.5;
}
.bxp-progress {
  margin: 0 0 16px;
  font-size: 15px;
}
</style>
