<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import brandLogo from '../assets/brand/cundang-chan.png'
import { DONATION_URL, GITHUB_REPO_URL, brandDisplayName } from '../config'
import { locale, t } from '../i18n'
import { appVersion, openExternal } from '../tauri'

const props = defineProps<{
  open: boolean
  rightsHolder?: string
  gameName?: string | null
}>()

const emit = defineEmits<{
  close: []
  donate: []
}>()

const version = ref('')
const displayBrand = computed(() => brandDisplayName(locale.value))
const disclaimerText = computed(() => {
  if (props.rightsHolder && props.gameName) {
    return t('about.disclaimer', props.rightsHolder, props.gameName)
  }
  return t('about.disclaimerGeneric')
})

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
      <img class="logo" :src="brandLogo" alt="" width="72" height="72" />
      <p class="name">{{ displayBrand }}</p>
      <p class="tagline">{{ t('app.tagline') }}</p>
      <p v-if="version" class="meta">{{ t('about.version', version) }}</p>
      <p class="disclaimer">{{ disclaimerText }}</p>
      <div class="actions">
        <button v-if="GITHUB_REPO_URL" type="button" @click="openUrl(GITHUB_REPO_URL)">
          {{ t('about.github') }}
        </button>
        <button v-if="DONATION_URL" type="button" @click="emit('donate')">
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
  z-index: 50;
  padding: 1rem;
}

.about {
  width: min(420px, 100%);
  border-radius: 14px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-bg-elevated, #141c24);
  padding: 1.35rem 1.4rem 1.2rem;
  color: var(--ss-text, #e8eef2);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.logo {
  display: block;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(61, 154, 139, 0.55);
  margin-bottom: 0.75rem;
}

.name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.tagline {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--ss-muted, #8fa3b0);
}

.meta {
  margin: 0.55rem 0 0;
  font-size: 0.85rem;
  color: #a8bcc8;
}

.disclaimer {
  margin: 0.85rem 0 1rem;
  font-size: 0.82rem;
  line-height: 1.55;
  color: #b7c7d0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

button {
  border-radius: 8px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-surface, #1a2430);
  color: inherit;
  padding: 0.4em 0.85em;
  cursor: pointer;
  font: inherit;
}

button:hover {
  border-color: var(--ss-accent, #3d9a8b);
}
</style>
