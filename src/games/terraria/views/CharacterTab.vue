<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { applyMoney, moneyFromState } from '../model/playerModel'
import { useTeEditor } from './inject'

const editor = useTeEditor()
const money = computed(() => moneyFromState(editor.save))

function setName(v: string) {
  editor.markDirty(() => {
    editor.save.name = v
  })
}

function setDiff(v: number | undefined) {
  if (v === undefined) return
  editor.markDirty(() => {
    editor.save.difficulty = v
  })
}

function setStat(key: 'statLife' | 'statLifeMax' | 'statMana' | 'statManaMax', v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    editor.save[key] = Math.max(0, Math.floor(v))
  })
}

function setMoney(part: 'platinum' | 'gold' | 'silver' | 'copper', v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    const cur = moneyFromState(editor.save)
    cur[part] = Math.max(0, Math.floor(v))
    applyMoney(editor.save, cur)
  })
}

function fillToMax() {
  editor.markDirty(() => {
    editor.save.statLife = editor.save.statLifeMax
    editor.save.statMana = editor.save.statManaMax
  })
}
</script>

<template>
  <p class="te-hint">{{ t('te.character.renameHint') }}</p>
  <el-form label-width="120px" style="max-width: 520px">
    <el-form-item :label="t('te.character.name')">
      <el-input :model-value="editor.save.name" maxlength="20" @update:model-value="setName" />
    </el-form-item>
    <el-form-item :label="t('te.character.difficulty')">
      <el-select :model-value="editor.save.difficulty" style="width: 100%" @update:model-value="setDiff">
        <el-option :value="0" :label="t('te.difficulty.classic')" />
        <el-option :value="1" :label="t('te.difficulty.mediumcore')" />
        <el-option :value="2" :label="t('te.difficulty.hardcore')" />
        <el-option :value="3" :label="t('te.difficulty.journey')" />
      </el-select>
    </el-form-item>
    <el-form-item :label="t('te.character.life')">
      <el-input-number
        :model-value="editor.save.statLife"
        :min="0"
        @update:model-value="(v) => setStat('statLife', v ?? undefined)"
      />
      <span class="te-sep">/</span>
      <el-input-number
        :model-value="editor.save.statLifeMax"
        :min="1"
        @update:model-value="(v) => setStat('statLifeMax', v ?? undefined)"
      />
    </el-form-item>
    <el-form-item :label="t('te.character.mana')">
      <el-input-number
        :model-value="editor.save.statMana"
        :min="0"
        @update:model-value="(v) => setStat('statMana', v ?? undefined)"
      />
      <span class="te-sep">/</span>
      <el-input-number
        :model-value="editor.save.statManaMax"
        :min="0"
        @update:model-value="(v) => setStat('statManaMax', v ?? undefined)"
      />
    </el-form-item>
    <el-form-item :label="t('te.character.platinum')">
      <el-input-number :model-value="money.platinum" :min="0" @update:model-value="(v) => setMoney('platinum', v ?? undefined)" />
    </el-form-item>
    <el-form-item :label="t('te.character.gold')">
      <el-input-number :model-value="money.gold" :min="0" @update:model-value="(v) => setMoney('gold', v ?? undefined)" />
    </el-form-item>
    <el-form-item :label="t('te.character.silver')">
      <el-input-number :model-value="money.silver" :min="0" @update:model-value="(v) => setMoney('silver', v ?? undefined)" />
    </el-form-item>
    <el-form-item :label="t('te.character.copper')">
      <el-input-number :model-value="money.copper" :min="0" @update:model-value="(v) => setMoney('copper', v ?? undefined)" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="fillToMax">{{ t('te.character.fillMax') }}</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.te-hint {
  opacity: 0.75;
  margin: 0 0 12px;
  font-size: 13px;
}
.te-sep {
  margin: 0 8px;
}
</style>
