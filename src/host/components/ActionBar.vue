<script setup lang="ts">
import { computed } from 'vue'
import type { ActionSpec } from '@sdk/types'
import { t } from '../i18n'
import { useSessionStore } from '../stores/session'

const store = useSessionStore()

const actions = computed<ActionSpec[]>(() => {
  if (!store.game || store.state == null) return []
  return store.game.actions(store.state)
})

function onButton(id: string): void {
  store.runAction(id)
}

function onToggle(action: ActionSpec, checked: boolean): void {
  store.runAction(action.id, checked)
}

function onNumber(action: ActionSpec, raw: string): void {
  const n = Number(raw)
  if (Number.isNaN(n)) return
  store.runAction(action.id, n)
}
</script>

<template>
  <div v-if="actions.length" class="bar">
    <template v-for="action in actions" :key="action.id">
      <button
        v-if="action.kind === 'button'"
        type="button"
        :disabled="action.disabled"
        @click="onButton(action.id)"
      >
        {{ t(action.labelKey) }}
      </button>
      <label v-else-if="action.kind === 'toggle'" class="toggle">
        <input
          type="checkbox"
          :checked="Boolean(action.value)"
          :disabled="action.disabled"
          @change="onToggle(action, ($event.target as HTMLInputElement).checked)"
        />
        {{ t(action.labelKey) }}
      </label>
      <label v-else-if="action.kind === 'number'" class="number">
        {{ t(action.labelKey) }}
        <input
          type="number"
          :value="action.value"
          :min="action.min"
          :max="action.max"
          :step="action.step"
          :disabled="action.disabled"
          @change="onNumber(action, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </template>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

button,
.toggle,
.number {
  border-radius: 8px;
  border: 1px solid #2c2c36;
  background: #22222b;
  color: #f3f3f5;
  padding: 0.4em 0.8em;
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled,
input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toggle,
.number {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

input[type='number'] {
  width: 5.5rem;
  border-radius: 6px;
  border: 1px solid #2c2c36;
  background: #14141a;
  color: #f3f3f5;
  padding: 0.2em 0.4em;
  font: inherit;
}
</style>
