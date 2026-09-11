<script setup lang="ts">
import { locale, t } from '../i18n'
import { formatBackupSize, formatBackupTime } from '../backupFormat'
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
        <div class="meta">
          <div class="primary">
            <span class="when">{{ formatBackupTime(item.mtimeMs, locale) }}</span>
            <span class="size">{{ formatBackupSize(item.size, locale) }}</span>
          </div>
          <div class="secondary">
            <span class="file">{{ t('backups.target', item.relativePath) }}</span>
            <span class="name" :title="item.name">{{ item.name }}</span>
          </div>
        </div>
        <div class="actions">
          <button type="button" @click="emit('restore', item.relativePath, item.name)">
            {{ t('backups.restore') }}
          </button>
          <button type="button" class="danger" @click="emit('remove', item.relativePath, item.name)">
            {{ t('backups.delete') }}
          </button>
        </div>
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
  gap: 0.55rem;
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 0.75rem;
  font-size: 0.85rem;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
}

.primary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.65rem;
}

.when {
  font-weight: 600;
}

.size {
  color: #b8b8c4;
}

.secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  color: #9a9aa8;
  font-size: 0.8rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.actions {
  display: flex;
  gap: 0.45rem;
  flex-shrink: 0;
}

.empty {
  margin: 0;
  font-size: 0.85rem;
  color: #9a9aa8;
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
