<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameModule } from '@sdk/types'
import AboutDialog from './components/AboutDialog.vue'
import EditorPage from './components/EditorPage.vue'
import LibraryPage from './components/LibraryPage.vue'
import { APP_NAME } from './config'
import { locale, setLocale, t } from './i18n'
import { currentSlotLabel, windowTitle } from './sessionContext'
import { useSessionStore } from './stores/session'

const store = useSessionStore()
const aboutOpen = ref(false)

const gameName = computed(() => {
  if (!store.game) return null
  return store.game.catalog.name[locale.value]
})

const slotLabel = computed(() => currentSlotLabel(store.slots, store.currentSlotId))

watch(
  [gameName],
  () => {
    document.title = windowTitle(APP_NAME, gameName.value)
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
          <span class="brand">{{ APP_NAME }}</span>
          <span v-if="gameName" class="game-name">{{ gameName }}</span>
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
        <button type="button" @click="aboutOpen = true">{{ t('nav.about') }}</button>
      </div>
    </header>

    <EditorPage v-if="store.game" />
    <LibraryPage v-else @open="onOpen" />

    <AboutDialog
      :open="aboutOpen"
      :rights-holder="store.game?.catalog.rightsHolder"
      @close="aboutOpen = false"
    />
  </div>
</template>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: #f3f3f5;
  background-color: #0f0f14;
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
  background: #0f0f14;
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
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #23232c;
  background: #14141a;
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
  align-items: baseline;
  gap: 0.55rem 0.85rem;
}

.brand {
  font-weight: 650;
  letter-spacing: 0.02em;
}

.game-name {
  font-size: 1.05rem;
  font-weight: 700;
}

.dir,
.slot {
  margin: 0;
  font-size: 0.8rem;
  color: #b0b0bc;
  word-break: break-all;
}

.slot {
  color: #c9c9d4;
}

.nav {
  display: flex;
  flex-shrink: 0;
  gap: 0.45rem;
}

.nav button {
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #1c1c24;
  color: #f3f3f5;
  padding: 0.35em 0.75em;
  cursor: pointer;
}

.nav button.active {
  border-color: #3b6dff;
  background: #243056;
}
</style>
