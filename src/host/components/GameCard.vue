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
        {{ found ? t('library.detected') : t('library.missing') }}
      </p>
      <div class="actions">
        <button type="button" @click="emit('choose')">{{ t('library.chooseDir') }}</button>
        <button type="button" class="primary" :disabled="!found" @click="emit('open')">
          {{ t('library.openGame') }}
        </button>
        <button v-if="storeUrl" type="button" @click="openStore">{{ t('library.store') }}</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #16161c;
  color: #f3f3f5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.cover {
  height: 140px;
  background: #0e0e12;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.body {
  padding: 1rem 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

h2 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.3;
}

.rights {
  margin: 0;
  font-size: 0.8rem;
  color: #9a9aa8;
}

.status {
  margin: 0.15rem 0 0.4rem;
  font-size: 0.85rem;
  color: #c9a227;
}

.status.ok {
  color: #6fbf73;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

button {
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #22222b;
  color: #f3f3f5;
  padding: 0.45em 0.85em;
  font: inherit;
  cursor: pointer;
}

button.primary {
  background: #3b6dff;
  border-color: #3b6dff;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  border-color: #5b8cff;
}
</style>
