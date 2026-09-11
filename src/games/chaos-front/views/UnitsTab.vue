<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { characterById, gameData, isUnusedEntry, unitTypeById } from '../model/gameData'
import { unitLevelForExp } from '../model/level'
import { gameImage } from '../lib/images'
import { t } from '../i18n'
import { useCfEditor } from './inject'

interface UnitRow {
  index: number
  unitType: number
  characterId: number
  custom: number
  exp: number
  itemCount: number
}

const editor = useCfEditor()
const units = computed((): UnitRow[] => {
  void editor.rev
  return (editor.save?.units ?? []).map((u, index) => ({
    index,
    unitType: u.unitType,
    characterId: u.characterId,
    custom: u.custom,
    exp: u.exp,
    itemCount: (u.items ?? []).filter((id) => id > 0).length
  }))
})

function typeName(typeId: number): string {
  return unitTypeById(gameData, typeId)?.name ?? t('units.unknownType', typeId)
}
function levelOf(exp: number, unitType: number): number {
  const lt = unitTypeById(gameData, unitType)?.levelType ?? 12
  return unitLevelForExp(exp, gameData.levelTables[String(lt)] ?? [])
}
function pilotName(id: number): string {
  return characterById(gameData, id)?.name ?? ''
}
function changed(index: number, v: number | undefined): void {
  if (v === undefined || v === null) return
  editor.markDirty(() => editor.save.setUnitExp(index, v))
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
const groups = computed(() => {
  const unlockable = gameData.unitTypes.filter((x) => !isUnusedEntry(x))
  return [
    { title: t('units.warships'), ids: unlockable.filter((x) => x.kind === 1).map((x) => x.id) },
    {
      title: t('units.large'),
      ids: unlockable.filter((x) => x.kind === 2 && x.size === 1).map((x) => x.id)
    },
    {
      title: t('units.small'),
      ids: unlockable.filter((x) => x.kind === 2 && x.size === 0).map((x) => x.id)
    }
  ]
})
function confirmAdd(): void {
  if (!addType.value) return
  const entry = unitTypeById(gameData, addType.value)
  if (!entry || isUnusedEntry(entry)) return
  editor.markDirty(() => editor.save.addUnit(gameData, addType.value!, addLevel.value))
  addVisible.value = false
  ElMessage.success(t('units.added'))
}
</script>

<template>
  <div :data-ss-rev="editor.rev">
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('units.maxAll') }}</el-button>
      <el-button @click="addVisible = true">{{ t('units.add') }}</el-button>
      <span class="count">{{ t('units.count', units.length) }}</span>
    </div>
    <el-table :data="units" size="small" max-height="560" row-key="index">
      <el-table-column label="" width="56">
        <template #default="{ row }">
          <img :src="gameImage(`unit-${row.unitType}`)" class="unit-img" />
        </template>
      </el-table-column>
      <el-table-column :label="t('units.name')" min-width="170">
        <template #default="{ row }">
          {{ typeName(row.unitType)
          }}<el-tag v-if="row.custom > 0" size="small" type="warning" style="margin-left: 6px">{{
            t('units.custom')
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('units.pilot')" width="120">
        <template #default="{ row }">
          <span v-if="row.characterId > 0">{{ pilotName(row.characterId) }}</span>
          <span v-else class="dim">—</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('units.level')" width="90">
        <template #default="{ row }">
          <el-tag>+{{ levelOf(row.exp, row.unitType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('units.exp')" width="180">
        <template #default="{ row }">
          <el-input-number
            size="small"
            :model-value="row.exp"
            :min="0"
            :max="999999"
            :step="100"
            controls-position="right"
            @update:model-value="(v) => changed(row.index, v ?? undefined)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('units.items')" width="80">
        <template #default="{ row }">{{ row.itemCount }}</template>
      </el-table-column>
      <el-table-column :label="t('units.actions')" width="90">
        <template #default="{ row }">
          <el-popconfirm :title="t('units.removeConfirm')" @confirm="remove(row.index)">
            <template #reference
              ><el-button size="small" type="danger">{{ t('units.remove') }}</el-button></template
            >
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
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.count {
  color: #909399;
}
.unit-img {
  width: 40px;
  image-rendering: pixelated;
}
.dim {
  color: #c0c4cc;
}
</style>
