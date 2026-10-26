<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@host/i18n'
import { setPlayerScalar } from '../model/saveModel'
import type { PlayerScalarKey } from '../model/types'
import { useBcEditor } from './inject'

const editor = useBcEditor()

type ScalarField = {
  key: PlayerScalarKey
  labelKey: string
  min: number
  step: number
}

const scalarFields: ScalarField[] = [
  { key: 'level', labelKey: 'bc.character.level', min: 1, step: 1 },
  { key: 'experienceCurrent', labelKey: 'bc.character.experienceCurrent', min: 0, step: 1 },
  {
    key: 'healthUpgradeFragmentCount',
    labelKey: 'bc.character.healthUpgradeFragmentCount',
    min: 0,
    step: 1
  },
  {
    key: 'manaUpgradeFragmentCount',
    labelKey: 'bc.character.manaUpgradeFragmentCount',
    min: 0,
    step: 1
  },
  { key: 'atkBonusUpgradeCount', labelKey: 'bc.character.atkBonusUpgradeCount', min: 0, step: 1 },
  { key: 'defBonusUpgradeCount', labelKey: 'bc.character.defBonusUpgradeCount', min: 0, step: 1 },
  { key: 'currentHealth', labelKey: 'bc.character.currentHealth', min: 0, step: 1 },
  { key: 'currentMana', labelKey: 'bc.character.currentMana', min: 0, step: 1 },
  {
    key: 'currentHealChargesCount',
    labelKey: 'bc.character.currentHealChargesCount',
    min: 0,
    step: 1
  },
  {
    key: 'currentTheHermitDeathDefianceCount',
    labelKey: 'bc.character.currentTheHermitDeathDefianceCount',
    min: 0,
    step: 1
  }
]

function scalarValue(key: PlayerScalarKey): number {
  void editor.rev
  return Number(editor.save.player[key])
}

function changeScalar(key: PlayerScalarKey, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  editor.markDirty(() => {
    setPlayerScalar(editor.save, key, v)
  })
}

const playerId = computed(() => {
  void editor.rev
  return editor.save.player.id
})
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <el-alert type="warning" show-icon :closable="false" :title="t('bc.hint.quitAndCloud')" class="warn" />
    <p class="meta">{{ t('bc.character.playerId') }}: {{ playerId }}</p>
    <el-form label-width="240px" style="max-width: 640px">
      <el-form-item v-for="f in scalarFields" :key="f.key" :label="t(f.labelKey)">
        <el-input-number
          :model-value="scalarValue(f.key)"
          :min="f.min"
          :step="f.step"
          @update:model-value="(v) => changeScalar(f.key, v ?? undefined)"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.warn {
  margin-bottom: 16px;
}
.meta {
  margin: 0 0 12px;
  font-size: 13px;
  opacity: 0.75;
}
</style>
