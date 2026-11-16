<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t, translateError } from '@host/i18n'
import { deleteNightmareRunSlots } from '../model/deleteNightmareRuns'
import { isNightmareRunSlotName } from '../model/nightmareRunSlots'
import { usePbzEditor } from './inject'

const editor = usePbzEditor()
const deleting = ref(false)

const nightmareRunNames = computed(() => {
  void editor.rev
  return editor.save.container.slots
    .map(({ entry }) => entry.name)
    .filter(isNightmareRunSlotName)
})

async function onDelete(): Promise<void> {
  if (nightmareRunNames.value.length === 0 || deleting.value) return
  try {
    await ElMessageBox.confirm(
      t('pbz.resources.deleteNightmareConfirm'),
      t('pbz.resources.deleteNightmareTitle'),
      {
        type: 'warning',
        confirmButtonText: t('pbz.resources.deleteNightmareConfirmButton'),
        cancelButtonText: t('pbz.resources.cancel')
      }
    )
  } catch {
    return
  }

  deleting.value = true
  try {
    const result = await deleteNightmareRunSlots(editor.save)
    editor.markDirty()
    ElMessage.success(
      t('pbz.resources.deleteNightmareDone', String(result.deletedRunNames.length))
    )
  } catch (error) {
    ElMessage.error(translateError(error) || t('pbz.resources.deleteNightmareFailed'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="pbz-nightmare" :data-ss-rev="editor.rev">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      :title="t('pbz.resources.deleteNightmareHint')"
    />

    <el-empty
      v-if="nightmareRunNames.length === 0"
      :description="t('pbz.resources.deleteNightmareEmpty')"
    />
    <template v-else>
      <p class="pbz-nightmare__list">
        {{ t('pbz.resources.deleteNightmareSlots', nightmareRunNames.join(', ')) }}
      </p>
      <el-button type="danger" :loading="deleting" @click="onDelete">
        {{ t('pbz.resources.deleteNightmareButton') }}
      </el-button>
    </template>
  </div>
</template>

<style scoped>
.pbz-nightmare {
  display: grid;
  gap: 16px;
  max-width: 640px;
}

.pbz-nightmare__list {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
  word-break: break-all;
}
</style>
