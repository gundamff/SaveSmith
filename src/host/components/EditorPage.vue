<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { ModuleError } from '@sdk/error'
import { t, translateError } from '../i18n'
import { useSessionStore } from '../stores/session'
import BackupPanel from './BackupPanel.vue'
import SlotList from './SlotList.vue'

const store = useSessionStore()

provide('savesmithState', () => store.state)
provide('savesmithMutate', store.mutate)

const views = computed(() => store.game?.views ?? [])
const activeViewId = ref<string | null>(null)

watch(
  views,
  (list) => {
    if (!list.some((v) => v.id === activeViewId.value)) {
      activeViewId.value = list[0]?.id ?? null
    }
  },
  { immediate: true }
)

const activeView = computed(() => views.value.find((v) => v.id === activeViewId.value) ?? views.value[0] ?? null)

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

async function onRemoveBackup(relativePath: string, backupName: string): Promise<void> {
  if (!window.confirm(t('backups.deleteConfirm', backupName))) return
  try {
    await store.removeBackup(relativePath, backupName)
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
        <div v-if="store.state != null && views.length" class="views">
          <nav class="tabs" role="tablist">
            <button
              v-for="view in views"
              :key="view.id"
              type="button"
              role="tab"
              :aria-selected="activeView?.id === view.id"
              :class="{ active: activeView?.id === view.id }"
              @click="activeViewId = view.id"
            >
              {{ t(view.labelKey) }}
            </button>
          </nav>
          <section v-if="activeView" :data-view="activeView.id">
            <component :is="activeView.component" />
          </section>
        </div>
        <BackupPanel v-if="store.currentSlotId" @restore="onRestore" @remove="onRemoveBackup" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tabs button {
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #22222b;
  color: #f3f3f5;
  padding: 0.35em 0.8em;
  font: inherit;
  cursor: pointer;
}

.tabs button.active {
  background: #3b6dff;
  border-color: #3b6dff;
}
</style>
