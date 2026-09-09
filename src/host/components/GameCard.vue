<script setup lang="ts">
import { computed } from 'vue'
import { resolveStoreUrl } from '@sdk/steam'
import type { GameModule } from '@sdk/types'
import { locale, t } from '../i18n'
import { openExternal } from '../tauri'

const props = defineProps<{
  module: GameModule
  detectedDir?: string
}>()

const emit = defineEmits<{
  choose: []
  open: []
}>()

const storeUrl = computed(() => resolveStoreUrl(props.module.catalog))
const title = computed(() => props.module.catalog.name[locale.value])
const found = computed(() => Boolean(props.detectedDir))

function openStore(): void {
  if (storeUrl.value) void openExternal(storeUrl.value)
}
</script>

<template>
  <article class="card">
    <div class="cover">
      <img
        v-if="module.catalog.cover"
        :src="module.catalog.cover"
        :alt="title"
      />
    </div>
    <div class="body">
      <h2>{{ title }}</h2>
      <p class="rights">{{ module.catalog.rightsHolder }}</p>
      <p class="status" :class="{ ok: found }">
        <span class="dot" aria-hidden="true" />
        {{ found ? t('library.detected') : t('library.missing') }}
      </p>
      <div class="actions">
        <button type="button" class="primary" :disabled="!found" @click="emit('open')">
          {{ t('library.openGame') }}
        </button>
        <button type="button" @click="emit('choose')">{{ t('library.chooseDir') }}</button>
        <button v-if="storeUrl" type="button" class="ghost" @click="openStore">
          {{ t('library.store') }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(180deg, #1c2833 0%, #152028 100%);
  color: var(--ss-text, #e8eef2);
  border: 1px solid rgba(61, 154, 139, 0.18);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.32);
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.card:hover {
  border-color: rgba(61, 154, 139, 0.45);
  transform: translateY(-2px);
}

.cover {
  aspect-ratio: 460 / 215;
  height: auto;
  background: #0a1016;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.body {
  padding: 1rem 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

h2 {
  margin: 0;
  font-size: 1.18rem;
  line-height: 1.3;
  font-weight: 700;
}

.rights {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ss-muted, #8fa3b0);
}

.status {
  margin: 0.2rem 0 0.55rem;
  font-size: 0.85rem;
  color: var(--ss-warn, #c9a227);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.status.ok {
  color: var(--ss-ok, #6fbf73);
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

button {
  border-radius: 8px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: #22303c;
  color: var(--ss-text, #e8eef2);
  padding: 0.48em 0.9em;
  font: inherit;
  cursor: pointer;
}

button.primary {
  background: var(--ss-accent, #3d9a8b);
  border-color: var(--ss-accent, #3d9a8b);
  color: #04120f;
  font-weight: 650;
}

button.ghost {
  background: transparent;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  border-color: var(--ss-accent, #3d9a8b);
}

button.primary:hover:not(:disabled) {
  background: var(--ss-accent-strong, #2f7f72);
  border-color: var(--ss-accent-strong, #2f7f72);
}
</style>
