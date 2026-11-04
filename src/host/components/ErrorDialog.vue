<script setup lang="ts">
import { t } from '../i18n'

defineProps<{
  open: boolean
  title: string
  message: string
  stack?: string | null
}>()

const emit = defineEmits<{
  close: []
  copy: []
}>()
</script>

<template>
  <div v-if="open" class="mask" @click.self="emit('close')">
    <div class="dialog" role="alertdialog" aria-modal="true" :aria-label="title">
      <p class="title">{{ title }}</p>
      <pre class="message">{{ message }}</pre>
      <div v-if="stack" class="stack-wrap">
        <p class="stack-label">{{ t('editor.stackTrace') }}</p>
        <pre class="stack">{{ stack }}</pre>
      </div>
      <div class="actions">
        <button type="button" class="primary" @click="emit('copy')">
          {{ t('editor.copyDetails') }}
        </button>
        <button type="button" @click="emit('close')">{{ t('editor.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.55);
}

.dialog {
  width: min(620px, 100%);
  max-height: min(80vh, 720px);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-bg-elevated, #141c24);
  color: var(--ss-text, #e8eef2);
  padding: 1.25rem 1.35rem 1.1rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.title {
  margin: 0 0 0.65rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f0b4b4;
}

.message,
.stack {
  margin: 0;
  border-radius: 8px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: rgba(8, 12, 16, 0.5);
  padding: 0.65rem 0.75rem;
  font-family: 'Cascadia Mono', Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.stack-wrap {
  margin-top: 0.75rem;
}

.stack-label {
  margin: 0 0 0.3rem;
  font-size: 0.82rem;
  color: var(--ss-muted, #8fa3b0);
}

.stack {
  max-height: 180px;
  overflow: auto;
  color: #b8c0cc;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

button {
  border-radius: 8px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-surface, #1a2430);
  color: inherit;
  padding: 0.4em 0.85em;
  font: inherit;
  cursor: pointer;
}

button:hover {
  border-color: var(--ss-accent, #3d9a8b);
}

button.primary {
  background: #3b6dff;
  border-color: #3b6dff;
  color: #fff;
}
</style>
