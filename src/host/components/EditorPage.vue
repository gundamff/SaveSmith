<script setup lang="ts">
import { computed, provide } from 'vue'
import { ModuleError } from '@sdk/error'
import { t, translateError } from '../i18n'
import { useSessionStore } from '../stores/session'
import ActionBar from './ActionBar.vue'
import BackupPanel from './BackupPanel.vue'
import SlotList from './SlotList.vue'

const store = useSessionStore()

provide('savesmithState', () => store.state)
provide('savesmithMutate', store.mutate)

const views = computed(() => store.game?.views ?? [])

function confirmLeave(): boolean {
  if (!store.dirty) return true
  return window.confirm(t('editor.unsavedConfirm'))
}

function onLibrary(): void {
  if (!confirmLeave()) return
  store.goLibrary()
}

async function onSelectSlot(slotId: string): Promise<void> {
  if (slotId === store.currentSlotId) return
  if (!confirmLeave()) return
  await store.loadSlot(slotId)
}

async function onSave(): Promise<void> {
  try {
    const issues = await store.save()
    if (issues.length) {
      window.alert(
        issues.map((issue) => translateError(new ModuleError(issue.code, issue.args))).join('\n')
      )
    }
  } catch (e) {
    window.alert(translateError(e))
  }
}

async function onRestore(relativePath: string, backupName: string): Promise<void> {
  if (!confirmLeave()) return
  if (!window.confirm(t('editor.restoreConfirm'))) return
  try {
    await store.restore(relativePath, backupName)
  } catch (e) {
    window.alert(translateError(e))
  }
}
</script>

<template>
  <section class="editor">
    <p class="quit">{{ t('editor.quitGame') }}</p>
    <div class="toolbar">
      <button type="button" @click="onLibrary">{{ t('editor.library') }}</button>
      <button type="button" class="primary" :disabled="store.state == null" @click="onSave">
        {{ t('editor.save') }}
      </button>
      <span v-if="store.dirty" class="dirty">{{ t('editor.dirty') }}</span>
      <p v-if="store.loadError" class="err">{{ store.loadError }}</p>
    </div>
    <div class="body">
      <SlotList @select="onSelectSlot" />
      <div class="main">
        <ActionBar />
        <div v-if="store.state != null && views.length" class="views">
          <section v-for="view in views" :key="view.id" :data-view="view.id">
            <h2>{{ t(view.labelKey) }}</h2>
            <component :is="view.component" />
          </section>
        </div>
        <BackupPanel v-if="store.currentSlotId" @restore="onRestore" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 53px);
}

.quit {
  margin: 0;
  padding: 0.55rem 1.25rem;
  background: #3a2a10;
  color: #f0d48a;
  font-size: 0.9rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem 1.25rem;
  border-bottom: 1px solid #23232c;
}

.toolbar button {
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #22222b;
  color: #f3f3f5;
  padding: 0.4em 0.85em;
  font: inherit;
  cursor: pointer;
}

.toolbar .primary {
  background: #3b6dff;
  border-color: #3b6dff;
}

.toolbar button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dirty {
  color: #e6b325;
  font-size: 0.85rem;
}

.err {
  margin: 0;
  color: #e57373;
  font-size: 0.85rem;
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main {
  flex: 1;
  min-width: 0;
  padding: 1rem 1.25rem 0;
}

.views {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.views h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
</style>
