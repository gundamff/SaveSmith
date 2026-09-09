<script setup lang="ts">
import { ref } from 'vue'
import type { GameModule } from '@sdk/types'
import LibraryPage from './components/LibraryPage.vue'
import { APP_NAME } from './config'
import { locale, setLocale, t } from './i18n'

const aboutOpen = ref(false)
const opened = ref<{ game: GameModule; dir: string } | null>(null)

function onOpen(game: GameModule, dir: string): void {
  opened.value = { game, dir }
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

    <LibraryPage @open="onOpen" />

    <p v-if="opened" class="placeholder">
      {{ opened.game.catalog.name[locale] }} · {{ opened.dir }}
    </p>

    <div v-if="aboutOpen" class="mask" @click.self="aboutOpen = false">
      <div class="about" role="dialog">
        <p>{{ APP_NAME }}</p>
        <button type="button" @click="aboutOpen = false">OK</button>
      </div>
    </div>
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

.placeholder {
  margin: 0 1.5rem 1.5rem;
  color: #9a9aa8;
  font-size: 0.9rem;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.about {
  background: #1a1a22;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  min-width: 200px;
  text-align: center;
}

.about button {
  margin-top: 0.75rem;
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #22222b;
  color: #f3f3f5;
  padding: 0.35em 0.9em;
  cursor: pointer;
}
</style>
