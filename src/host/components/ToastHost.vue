<script setup lang="ts">
import { dismissToast, toasts } from '../toast'
</script>

<template>
  <div class="toast-stack" role="status" aria-live="polite">
    <button
      v-for="toast in toasts"
      :key="toast.id"
      type="button"
      class="toast"
      :class="toast.kind"
      @click="dismissToast(toast.id)"
    >
      {{ toast.message }}
    </button>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  max-width: min(420px, calc(100vw - 2rem));
  border-radius: 10px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-bg-elevated, #141c24);
  color: var(--ss-text, #e8eef2);
  padding: 0.65rem 0.9rem;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  animation: ss-toast-in 0.16s ease-out;
}

.toast.success {
  border-color: rgba(111, 191, 115, 0.65);
}

.toast.error {
  border-color: rgba(229, 115, 115, 0.75);
}

.toast.info {
  border-color: rgba(122, 162, 255, 0.55);
}

@keyframes ss-toast-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
