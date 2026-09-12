<script setup lang="ts">
import { computed, nextTick, provide, ref, toRef, watch } from 'vue'
import { ModuleError } from '@sdk/error'
import { t, translateError } from '../i18n'
import { openExternal } from '../tauri'
import { useSessionStore } from '../stores/session'
import BackupPanel from './BackupPanel.vue'
import SlotList from './SlotList.vue'

const DS_CID_DB_URL = 'https://dragonswordawakening.th.gl/'

const store = useSessionStore()

provide('savesmithState', () => store.state)
provide('savesmithMutate', store.mutate)
provide('savesmithRev', toRef(store, 'revision'))

const views = computed(() => store.game?.views ?? [])
const showDsCidHint = computed(() => store.game?.id === 'dragon-sword')
const activeViewId = ref<string | null>(null)
const viewBusy = ref(false)
const mountedViewId = ref<string | null>(null)

watch(
  views,
  (list) => {
    if (!list.some((v) => v.id === activeViewId.value)) {
      activeViewId.value = list[0]?.id ?? null
    }
  },
  { immediate: true }
)

watch(
  activeViewId,
  async (id) => {
    if (!id) {
      mountedViewId.value = null
      return
    }
    if (id === mountedViewId.value) return
    viewBusy.value = true
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    mountedViewId.value = id
    await nextTick()
    viewBusy.value = false
  },
  { immediate: true }
)

const activeView = computed(() => views.value.find((v) => v.id === mountedViewId.value) ?? null)

const overlayMessage = computed(() => {
  if (store.busy && store.busyMessageKey) return t(store.busyMessageKey)
  if (viewBusy.value) return t('editor.busyView')
  return null
})

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
    if (store.backups.some((b) => b.name === backupName)) {
      window.alert(t('backups.deleteFailed', backupName))
    }
  } catch (e) {
    window.alert(translateError(e))
  }
}

function openCidDb(): void {
  void openExternal(DS_CID_DB_URL)
}
</script>

<template>
  <section class="editor">
    <p class="quit">{{ t('editor.quitGame') }}</p>
    <div class="toolbar">
      <button type="button" :disabled="store.busy" @click="onLibrary">{{ t('editor.library') }}</button>
      <button
        type="button"
        class="primary"
        :disabled="store.state == null || store.busy"
        @click="onSave"
      >
        {{ t('editor.save') }}
      </button>
      <span v-if="store.dirty" class="dirty">{{ t('editor.dirty') }}</span>
      <p v-if="store.loadError" class="err">{{ store.loadError }}</p>
    </div>
    <div class="body">
      <SlotList @select="onSelectSlot" />
      <div class="main">
        <p v-if="showDsCidHint" class="cid-hint">
          <span>{{ t('ds.cidHint') }}</span>
          <button type="button" class="linkish" :disabled="store.busy" @click="openCidDb">
            {{ t('ds.cidHintLink') }}
          </button>
        </p>
        <div v-if="store.state != null && views.length" class="views">
          <nav class="tabs" role="tablist">
            <button
              v-for="view in views"
              :key="view.id"
              type="button"
              role="tab"
              :aria-selected="mountedViewId === view.id"
              :disabled="store.busy || viewBusy"
              :class="{ active: mountedViewId === view.id }"
              @click="activeViewId = view.id"
            >
              {{ t(view.labelKey) }}
            </button>
          </nav>
          <section v-if="activeView" :data-view="activeView.id" :data-ss-rev="store.revision">
            <component :is="activeView.component" :data-ss-rev="store.revision" />
          </section>
        </div>
        <BackupPanel v-if="store.currentSlotId" @restore="onRestore" @remove="onRemoveBackup" />
      </div>
    </div>
    <div
      v-if="overlayMessage"
      class="busy-overlay"
      role="status"
      aria-live="polite"
      :aria-busy="true"
    >
      <div class="busy-card">
        <span class="busy-spinner" aria-hidden="true" />
        <p>{{ overlayMessage }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor {
  position: relative;
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

.cid-hint {
  margin: 0 0 0.85rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #1a1a22;
  color: #b8c0cc;
  font-size: 0.85rem;
  line-height: 1.45;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  align-items: baseline;
}

.cid-hint .linkish {
  border: none;
  background: none;
  padding: 0;
  color: #7aa2ff;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}

.cid-hint .linkish:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.tabs button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.busy-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 12, 16, 0.55);
}

.busy-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.2rem;
  border-radius: 10px;
  border: 1px solid #2c2c36;
  background: #14141c;
  color: #f3f3f5;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
}

.busy-card p {
  margin: 0;
  font-size: 0.95rem;
}

.busy-spinner {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  border: 2px solid rgba(59, 109, 255, 0.25);
  border-top-color: #3b6dff;
  animation: ss-spin 0.7s linear infinite;
}

@keyframes ss-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
