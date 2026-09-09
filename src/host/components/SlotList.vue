<script setup lang="ts">
import { t } from '../i18n'
import { useSessionStore } from '../stores/session'

const store = useSessionStore()

const emit = defineEmits<{
  select: [slotId: string]
}>()

function canLoad(readable: boolean, exists: boolean): boolean {
  return exists && readable
}
</script>

<template>
  <aside class="slots">
    <p v-if="!store.slots.length" class="empty">{{ t('editor.emptySlots') }}</p>
    <ul v-else>
      <li
        v-for="slot in store.slots"
        :key="slot.id"
        :class="{
          current: slot.id === store.currentSlotId,
          bad: !canLoad(slot.readable, slot.exists)
        }"
      >
        <button
          type="button"
          :disabled="!canLoad(slot.readable, slot.exists)"
          @click="emit('select', slot.id)"
        >
          <span class="title">{{ slot.title || slot.id }}</span>
          <span v-if="slot.subtitle" class="sub">{{ t('slots.savedAt', slot.subtitle) }}</span>
          <span v-if="!slot.exists" class="hint">{{ t('slots.empty') }}</span>
          <span v-else-if="!slot.readable" class="hint">{{ t('slots.unreadable') }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.slots {
  min-width: 200px;
  padding: 0.75rem 1rem;
  border-right: 1px solid #23232c;
  background: #121218;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

button {
  width: 100%;
  text-align: left;
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #1c1c24;
  color: #f3f3f5;
  padding: 0.55em 0.75em;
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.current button {
  border-color: #3b6dff;
  background: #243056;
}

.title {
  font-weight: 600;
}

.sub,
.hint,
.empty {
  font-size: 0.8rem;
  color: #9a9aa8;
}

.empty {
  margin: 0.25rem 0;
}
</style>
