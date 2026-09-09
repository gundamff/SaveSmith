<script setup lang="ts">
import { t } from '../i18n'
import { useSessionStore } from '../stores/session'

const store = useSessionStore()

const emit = defineEmits<{
  restore: [relativePath: string, backupName: string]
  remove: [relativePath: string, backupName: string]
}>()
</script>

<template>
  <section class="backups">
    <h2>{{ t('backups.title') }}</h2>
    <p v-if="!store.backups.length" class="empty">{{ t('backups.empty') }}</p>
    <ul v-else>
      <li v-for="item in store.backups" :key="`${item.relativePath}:${item.name}`">
        <span class="name">{{ item.name }}</span>
        <span class="file">{{ t('backups.file', item.relativePath) }}</span>
        <button type="button" @click="emit('restore', item.relativePath, item.name)">
          {{ t('backups.restore') }}
        </button>
        <button type="button" class="danger" @click="emit('remove', item.relativePath, item.name)">
          {{ t('backups.delete') }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.backups {
  padding: 0.75rem 1rem 1.25rem;
  border-top: 1px solid #23232c;
}

h2 {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.name {
  font-weight: 600;
}

.file,
.empty {
  color: #9a9aa8;
}

.empty {
  margin: 0;
  font-size: 0.85rem;
}

button {
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #22222b;
  color: #f3f3f5;
  padding: 0.25em 0.7em;
  font: inherit;
  cursor: pointer;
}

button.danger {
  border-color: #5a3030;
  background: #2a1a1a;
  color: #f0b4b4;
}

button.danger:hover {
  border-color: #a05050;
}
</style>
