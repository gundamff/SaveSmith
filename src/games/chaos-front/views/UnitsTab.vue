<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { characterById, gameData, unitTypeById } from '../model/gameData'
import { unitLevelForExp } from '../model/level'
import type { UnitEntry } from '../model/saveModel'
import { gameImage } from '../lib/images'
import { t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const units = computed(() => editor.save?.units ?? [])

function asUnit(row: unknown): UnitEntry {
  return row as UnitEntry
}

function typeName(typeId: number): string {
  return unitTypeById(gameData, typeId)?.name ?? t('units.unknownType', typeId)
}
function levelOf(u: { unitType: number; exp: number }): number {
  const lt = unitTypeById(gameData, u.unitType)?.levelType ?? 12
  return unitLevelForExp(u.exp, gameData.levelTables[String(lt)] ?? [])
}
function pilotName(id: number): string {
  return characterById(gameData, id)?.name ?? ''
}
function changed(u: UnitEntry, v: number | undefined): void {
  if (v === undefined || v === null) return
  editor.markDirty(() => editor.save.setUnitExp(units.value.indexOf(u), v))
}
function maxAll(): void {
  let n = 0
  editor.markDirty(() => {
    n = editor.save.maxAllUnits(gameData)
  })
  ElMessage.success(t('units.maxed', n))
}
function remove(index: number): void {
  editor.markDirty(() => editor.save.removeUnit(index))
}

const addVisible = ref(false)
const addType = ref<number | null>(null)
const addLevel = ref(6)
const groups = computed(() => [
  { title: t('units.warships'), ids: gameData.unitTypes.filter((x) => x.kind === 1).map((x) => x.id) },
  { title: t('units.large'), ids: gameData.unitTypes.filter((x) => x.kind === 2 && x.size === 1).map((x) => x.id) },
  { title: t('units.small'), ids: gameData.unitTypes.filter((x) => x.kind === 2 && x.size === 0).map((x) => x.id) }
])
function confirmAdd(): void {
  if (!addType.value) return
  editor.markDirty(() => editor.save.addUnit(gameData, addType.value!, addLevel.value))
  addVisible.value = false
  ElMessage.success(t('units.added'))
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('units.maxAll') }}</el-button>
      <el-button @click="addVisible = true">{{ t('units.add') }}</el-button>
      <span class="count">{{ t('units.count', units.length) }}</span>
    </div>
    <el-table :data="units" size="small" max-height="560">
      <el-table-column label="" width="56">
        <template #default="{ row }">
          <img :src="gameImage(`unit-${asUnit(row).unitType}`)" class="unit-img" />
        </template>
      </el-table-column>
      <el-table-column :label="t('units.name')" min-width="170">
        <template #default="{ row }">
          {{ typeName(asUnit(row).unitType) }}<el-tag v-if="asUnit(row).custom > 0" size="small" type="warning" style="margin-left: 6px">{{ t('units.custom') }}</el-tag>
          <el-tag size="small" style="margin-left: 6px">+{{ levelOf(asUnit(row)) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('units.pilot')" width="120">
        <template #default="{ row }">
          <span v-if="asUnit(row).characterId > 0">{{ pilotName(asUnit(row).characterId) }}</span>
          <span v-else class="dim">—</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('units.exp')" width="180">
        <template #default="{ row }">
          <el-input-number size="small" :model-value="asUnit(row).exp" :min="0" :max="999999" :step="100" controls-position="right" @change="(v) => changed(asUnit(row), v)" />
        </template>
      </el-table-column>
      <el-table-column :label="t('units.items')" width="80">
        <template #default="{ row }">{{ asUnit(row).items.filter((id) => id > 0).length }}</template>
      </el-table-column>
      <el-table-column :label="t('units.actions')" width="90">
        <template #default="{ row }">
          <el-popconfirm :title="t('units.removeConfirm')" @confirm="remove(units.indexOf(asUnit(row)))">
            <template #reference><el-button size="small" type="danger">{{ t('units.remove') }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="addVisible" :title="t('units.addTitle')" width="560">
      <el-form label-width="90px">
        <el-form-item :label="t('units.model')">
          <el-select v-model="addType" filterable :placeholder="t('units.modelPlaceholder')" style="width: 100%">
            <el-option-group v-for="g in groups" :key="g.title" :label="g.title">
              <el-option v-for="id in g.ids" :key="id" :value="id" :label="typeName(id)" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('units.initLevel')">
          <el-slider v-model="addLevel" :min="0" :max="6" show-stops style="width: 300px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">{{ t('units.cancel') }}</el-button>
        <el-button type="primary" :disabled="!addType" @click="confirmAdd()">{{ t('units.confirmAdd') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.count { color: #909399; }
.unit-img { width: 40px; image-rendering: pixelated; }
.dim { color: #c0c4cc; }
</style>
