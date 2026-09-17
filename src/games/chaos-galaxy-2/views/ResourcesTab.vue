<script setup lang="ts">
import { computed } from 'vue'
import { fillResources } from '../actions'
import { getEntry } from '../model/es3-binary'
import { factionLabel, gameData } from '../model/gameData'
import { t } from '../i18n'
import { useCg2Editor } from './inject'

const editor = useCg2Editor()

const playFaction = computed(() => {
  void editor.rev
  try {
    return editor.save.getPlayFaction()
  } catch {
    return 0
  }
})

const playFactionLabel = computed(() => factionLabel(gameData, playFaction.value, t('resources.factionFallback')))

const gold = computed(() => readInt(`Faction${playFaction.value}Gold`))
const supply = computed(() => readInt(`Faction${playFaction.value}Supply`))
const prestige = computed(() => readInt(`Faction${playFaction.value}Prestige`))
const economics = computed(() => readInt('PlayerEconomicsLevel'))
const playMonth = computed(() => readInt('playMonth'))

function readInt(key: string): number | null {
  void editor.rev
  const entry = getEntry(editor.save.entries, key)
  return typeof entry?.value === 'number' ? entry.value : null
}

function wrap(fn: () => void): void {
  editor.markDirty(fn)
}

function changeNum(apply: (v: number) => void, v: number | undefined): void {
  if (v === undefined || Number.isNaN(v)) return
  wrap(() => apply(v))
}

function maxResources(): void {
  wrap(() => fillResources(editor.save))
}
</script>

<template>
  <div v-if="editor.save" :data-ss-rev="editor.rev">
    <el-form label-width="220px" style="max-width: 640px">
      <el-form-item :label="t('resources.playFaction')">
        <span>{{ playFactionLabel }}</span>
      </el-form-item>
      <el-form-item :label="t('resources.gold')">
        <el-input-number
          v-if="gold !== null"
          :model-value="gold"
          :min="0"
          :max="gameData.resourceMaxGold"
          :step="10000"
          @update:model-value="(v) => changeNum((n) => editor.save.setFactionGold(playFaction, n), v ?? undefined)"
        />
        <span v-else class="missing">{{ t('resources.missing') }}</span>
      </el-form-item>
      <el-form-item :label="t('resources.supply')">
        <el-input-number
          v-if="supply !== null"
          :model-value="supply"
          :min="0"
          :max="gameData.resourceMaxSupply"
          :step="10000"
          @update:model-value="(v) => changeNum((n) => editor.save.setFactionSupply(playFaction, n), v ?? undefined)"
        />
        <span v-else class="missing">{{ t('resources.missing') }}</span>
      </el-form-item>
      <el-form-item :label="t('resources.prestige')">
        <el-input-number
          v-if="prestige !== null"
          :model-value="prestige"
          :min="0"
          :max="gameData.resourceMaxPrestige"
          :step="100"
          @update:model-value="(v) => changeNum((n) => editor.save.setFactionPrestige(playFaction, n), v ?? undefined)"
        />
        <span v-else class="missing">{{ t('resources.missing') }}</span>
      </el-form-item>
      <el-form-item :label="t('resources.economics')">
        <el-input-number
          v-if="economics !== null"
          :model-value="economics"
          :min="0"
          :max="99"
          @update:model-value="(v) => changeNum((n) => editor.save.setPlayerEconomicsLevel(n), v ?? undefined)"
        />
        <span v-else class="missing">{{ t('resources.missing') }}</span>
      </el-form-item>
      <el-form-item :label="t('resources.playMonth')">
        <el-input-number
          v-if="playMonth !== null"
          :model-value="playMonth"
          :min="0"
          :max="9999"
          @update:model-value="(v) => changeNum((n) => editor.save.setPlayMonth(n), v ?? undefined)"
        />
        <span v-else class="missing">{{ t('resources.missing') }}</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="maxResources()">{{ t('resources.maxAll') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.missing {
  color: #909399;
  font-size: 13px;
}
</style>
