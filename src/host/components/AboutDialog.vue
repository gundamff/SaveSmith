<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { APP_NAME, DONATION_URL, GITHUB_REPO_URL } from '../config'
import { t } from '../i18n'
import { appVersion, openExternal } from '../tauri'

defineProps<{
  open: boolean
  rightsHolder?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const version = ref('')

onMounted(async () => {
  try {
    version.value = await appVersion()
  } catch {
    version.value = ''
  }
})

function openUrl(url: string): void {
  void openExternal(url)
}
</script>

<template>
  <div v-if="open" class="mask" @click.self="emit('close')">
    <div class="about" role="dialog" :aria-label="t('about.title')">
      <p class="name">{{ APP_NAME }}</p>
      <p v-if="version" class="meta">{{ t('about.version', version) }}</p>
      <p class="disclaimer">{{ t('about.disclaimer', rightsHolder || APP_NAME) }}</p>
      <div class="actions">
        <button v-if="GITHUB_REPO_URL" type="button" @click="openUrl(GITHUB_REPO_URL)">
          {{ t('about.github') }}
        </button>
        <button v-if="DONATION_URL" type="button" @click="openUrl(DONATION_URL)">
          {{ t('about.donate') }}
        </button>
        <button type="button" @click="emit('close')">{{ t('about.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.about {
  background: #1a1a22;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  min-width: 280px;
  max-width: 28rem;
}

.name {
  margin: 0 0 0.4rem;
  font-weight: 700;
}

.meta {
  margin: 0 0 0.75rem;
  color: #9a9aa8;
  font-size: 0.85rem;
}

.disclaimer {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #c8c8d0;
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
  padding: 0.35em 0.9em;
  font: inherit;
  cursor: pointer;
}
</style>
