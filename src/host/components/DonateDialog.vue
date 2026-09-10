<script setup lang="ts">
import alipayQr from '../assets/donate/alipay.png'
import wechatQr from '../assets/donate/wechat.png'
import { DONATION_URL } from '../config'
import { t } from '../i18n'
import { openExternal } from '../tauri'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function openPaypal(): void {
  if (!DONATION_URL) return
  void openExternal(DONATION_URL)
}
</script>

<template>
  <div v-if="open" class="mask" @click.self="emit('close')">
    <div class="donate" role="dialog" :aria-label="t('donate.title')">
      <p class="title">{{ t('donate.title') }}</p>
      <p class="hint">{{ t('donate.hint') }}</p>

      <div class="codes">
        <figure class="code">
          <img :src="wechatQr" :alt="t('donate.wechat')" />
          <figcaption>{{ t('donate.wechat') }}</figcaption>
        </figure>
        <figure class="code">
          <img :src="alipayQr" :alt="t('donate.alipay')" />
          <figcaption>{{ t('donate.alipay') }}</figcaption>
        </figure>
      </div>

      <div class="actions">
        <button v-if="DONATION_URL" type="button" class="paypal" @click="openPaypal">
          {{ t('donate.paypal') }}
        </button>
        <button type="button" @click="emit('close')">{{ t('donate.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.donate {
  width: min(560px, 100%);
  border-radius: 14px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-bg-elevated, #141c24);
  padding: 1.35rem 1.4rem 1.2rem;
  color: var(--ss-text, #e8eef2);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.hint {
  margin: 0.4rem 0 1rem;
  font-size: 0.88rem;
  color: var(--ss-muted, #8fa3b0);
  line-height: 1.5;
}

.codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.code {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.code img {
  width: 100%;
  max-width: 220px;
  height: auto;
  border-radius: 10px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: #fff;
}

figcaption {
  font-size: 0.85rem;
  color: #a8bcc8;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.1rem;
}

button {
  border-radius: 8px;
  border: 1px solid var(--ss-border, #2a3a48);
  background: var(--ss-surface, #1a2430);
  color: inherit;
  padding: 0.4em 0.85em;
  cursor: pointer;
  font: inherit;
}

button:hover {
  border-color: var(--ss-accent, #3d9a8b);
}

.paypal {
  background: #3b6dff;
  border-color: #3b6dff;
  color: #fff;
}

.paypal:hover {
  border-color: #5a85ff;
  filter: brightness(1.05);
}

@media (max-width: 520px) {
  .codes {
    grid-template-columns: 1fr;
  }
}
</style>
