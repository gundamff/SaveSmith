<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { homeDir } from '@tauri-apps/api/path'
import type { GameModule } from '@sdk/types'
import { t } from '../i18n'
import { confirmSaveDir, probeModuleSaveDir } from '../probe'
import { modules } from '../registry'
import { listDirNames, pickFolder } from '../tauri'
import GameCard from './GameCard.vue'

const emit = defineEmits<{
  open: [game: GameModule, dir: string]
}>()

const detected = ref<Record<string, string>>({})

onMounted(() => {
  void probeAll()
})

async function windowsEnv(): Promise<Record<string, string | undefined>> {
  try {
    const home = await homeDir()
    return { USERPROFILE: home.replace(/[/\\]+$/, '') }
  } catch {
    return { USERPROFILE: '' }
  }
}

async function probeAll(): Promise<void> {
  const env = await windowsEnv()
  const next: Record<string, string> = { ...detected.value }
  for (const mod of modules) {
    try {
      const dir = await probeModuleSaveDir(mod.locate, env, listDirNames)
      if (dir) next[mod.id] = next[mod.id] ?? dir
    } catch {
      /* card stays on library.missing; keep any hand-picked dir */
    }
  }
  detected.value = next
}

async function onChoose(mod: GameModule): Promise<void> {
  let dir: string | null
  try {
    dir = await pickFolder()
  } catch {
    return
  }
  if (!dir) return
  const ok = await confirmSaveDir(mod.locate, dir, listDirNames)
  if (!ok) {
    window.alert(t('library.unrecognized'))
    return
  }
  detected.value = { ...detected.value, [mod.id]: dir }
}

function onOpen(mod: GameModule): void {
  const dir = detected.value[mod.id]
  if (!dir) return
  emit('open', mod, dir)
}
</script>

<template>
  <section class="library">
    <header class="hero">
      <h1>{{ t('library.title') }}</h1>
      <p class="subtitle">{{ t('library.subtitle') }}</p>
    </header>
    <div class="grid">
      <GameCard
        v-for="mod in modules"
        :key="mod.id"
        :module="mod"
        :detected-dir="detected[mod.id]"
        @choose="onChoose(mod)"
        @open="onOpen(mod)"
      />
    </div>
  </section>
</template>

<style scoped>
.library {
  padding: 1.75rem 1.75rem 2.5rem;
  flex: 1;
}

.hero {
  margin: 0 0 1.5rem;
  max-width: 40rem;
}

h1 {
  margin: 0;
  font-size: clamp(1.65rem, 2.4vw, 2.05rem);
  font-weight: 700;
  letter-spacing: 0.01em;
  font-family: 'Segoe UI Semibold', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.subtitle {
  margin: 0.45rem 0 0;
  font-size: 0.98rem;
  color: var(--ss-muted, #8fa3b0);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.15rem;
}
</style>
