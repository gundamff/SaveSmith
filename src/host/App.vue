<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameModule } from '@sdk/types'
import brandLogo from './assets/brand/cundang-chan.png'
import AboutDialog from './components/AboutDialog.vue'
import DonateDialog from './components/DonateDialog.vue'
import EditorPage from './components/EditorPage.vue'
import LibraryPage from './components/LibraryPage.vue'
import { APP_NAME, brandDisplayName } from './config'
import { locale, setLocale, t } from './i18n'
import { currentSlotLabel, windowTitle } from './sessionContext'
import { useSessionStore } from './stores/session'

const store = useSessionStore()
const aboutOpen = ref(false)
const donateOpen = ref(false)

function openDonateFromAbout(): void {
  aboutOpen.value = false
  donateOpen.value = true
}

const displayBrand = computed(() => brandDisplayName(locale.value))

const gameName = computed(() => {
  if (!store.game) return null
  return store.game.catalog.name[locale.value]
})

const slotLabel = computed(() => currentSlotLabel(store.slots, store.currentSlotId))

watch(
  [displayBrand, gameName],
  () => {
    // In-game title keeps English product id to avoid bilingual clutter in the OS title bar.
    document.title = windowTitle(store.game ? APP_NAME : displayBrand.value, gameName.value)
  },
  { immediate: true }
)

async function onOpen(game: GameModule, dir: string): Promise<void> {
  await store.openGame(game, dir)
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="identity">
        <div class="brand-row">
          <img class="brand-logo" :src="brandLogo" alt="" width="36" height="36" />
          <div class="brand-text">
            <span class="brand">{{ displayBrand }}</span>
            <span v-if="gameName" class="game-name">{{ gameName }}</span>
          </div>
        </div>
        <p v-if="store.game" class="dir" :title="store.saveDir">
          {{ t('editor.saveDir') }}：{{ store.saveDir }}
        </p>
        <p v-if="store.game" class="slot">
          <template v-if="slotLabel">{{ t('editor.currentSlot') }}：{{ slotLabel }}</template>
          <template v-else>{{ t('editor.noSlot') }}</template>
        </p>
      </div>
      <div class="nav">
        <button
          type="button"
          :class="{ active: locale === 'zh' }"
          @click="setLocale('zh')"
        >
          {{ t('nav.langZh') }}
        </button>
        <button
          type="button"
          :class="{ active: locale === 'en' }"
          @click="setLocale('en')"
        >
          {{ t('nav.langEn') }}
        </button>
        <button type="button" @click="donateOpen = true">{{ t('nav.donate') }}</button>
        <button type="button" @click="aboutOpen = true">{{ t('nav.about') }}</button>
      </div>
    </header>

    <EditorPage v-if="store.game" />
    <LibraryPage v-else @open="onOpen" />

    <AboutDialog
      :open="aboutOpen"
      @close="aboutOpen = false"
      @donate="openDonateFromAbout"
    />
    <DonateDialog :open="donateOpen" @close="donateOpen = false" />
  </div>
</template>

<style>
:root {
  --ss-bg: #0c1218;
  --ss-bg-elevated: #141c24;
  --ss-surface: #1a2430;
  --ss-border: #2a3a48;
  --ss-text: #e8eef2;
  --ss-muted: #8fa3b0;
  --ss-accent: #3d9a8b;
  --ss-accent-strong: #2f7f72;
  --ss-warn: #c9a227;
  --ss-ok: #6fbf73;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  font-weight: 400;
  color: var(--ss-text);
  background-color: var(--ss-bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

html,
body,
#app {
  margin: 0;
  min-height: 100%;
  background: var(--ss-bg);
}

button {
  font-family: inherit;
}
</style>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 900px 420px at 12% -10%, rgba(61, 154, 139, 0.18), transparent 55%),
    radial-gradient(ellipse 700px 380px at 88% 0%, rgba(70, 110, 160, 0.12), transparent 50%),
    var(--ss-bg);
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--ss-border);
  background: rgba(20, 28, 36, 0.88);
  backdrop-filter: blur(8px);
}

.identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.brand-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 0.85rem;
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(61, 154, 139, 0.55);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem 0.85rem;
  min-width: 0;
}

.brand {
  font-family: 'Segoe UI Semibold', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-weight: 650;
  letter-spacing: 0.02em;
  font-size: 1.05rem;
}

.game-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #c5d8e0;
}

.dir,
.slot {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ss-muted);
  word-break: break-all;
}

.slot {
  color: #b8c8d2;
}

.nav {
  display: flex;
  flex-shrink: 0;
  gap: 0.45rem;
}

.nav button {
  border-radius: 8px;
  border: 1px solid var(--ss-border);
  background: var(--ss-surface);
  color: var(--ss-text);
  padding: 0.35em 0.75em;
  cursor: pointer;
}

.nav button.active {
  border-color: var(--ss-accent);
  background: rgba(61, 154, 139, 0.22);
}

.nav button:hover {
  border-color: var(--ss-accent);
}
</style>
