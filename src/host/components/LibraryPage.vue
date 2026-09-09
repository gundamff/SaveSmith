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
    <h1>{{ t('library.title') }}</h1>
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
  padding: 1.25rem 1.5rem 2rem;
}

h1 {
  margin: 0 0 1.25rem;
  font-size: 1.4rem;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
</style>
