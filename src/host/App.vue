<script setup lang="ts">
import { ref } from 'vue'
import type { GameModule } from '@sdk/types'
import AboutDialog from './components/AboutDialog.vue'
import EditorPage from './components/EditorPage.vue'
import LibraryPage from './components/LibraryPage.vue'
import { APP_NAME } from './config'
import { locale, setLocale, t } from './i18n'
import { useSessionStore } from './stores/session'

const store = useSessionStore()
const aboutOpen = ref(false)

async function onOpen(game: GameModule, dir: string): Promise<void> {
  await store.openGame(game, dir)
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <span class="brand">{{ APP_NAME }}</span>
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
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #23232c;
  background: #14141a;
}

.brand {
  font-weight: 650;
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
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
