<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  abilityById,
  characterById,
  gameData,
  itemById,
  skillById,
  talentById,
  unitTypeById,
  weaponById
} from '../model/gameData'
import { characterLevelForExp } from '../model/level'
import { FORMATION_COLS, FORMATION_ROWS, itemSlotsForUnitType, type UnitEntry } from '../model/saveModel'
import { gameImage } from '../lib/images'
import { t, translateError } from '../i18n'
import { useCfEditor } from './inject'

type DragPayload =
  | { kind: 'unit'; index: number }
  | { kind: 'pilot'; id: number }

/** Electron/Chromium 对自定义 MIME 不可靠，拖拽载荷放内存 */
const dragPayload = ref<DragPayload | null>(null)

const editor = useCfEditor()
const selectedUnit = ref<number | null>(null)
const selectedFreePilot = ref<number | null>(null)
const detailFocus = ref<'unit' | 'pilot'>('unit')
const dragOverCell = ref<string | null>(null)
const dragOverBench = ref(false)
const dragOverUnitIdx = ref<number | null>(null)
const invTick = ref(0)

const units = computed(() => editor.save?.units ?? [])
const characters = computed(() => editor.save?.characters ?? [])

const rows = Array.from({ length: FORMATION_ROWS }, (_, i) => i + 1)
const cols = Array.from({ length: FORMATION_COLS }, (_, i) => i)

const undeployed = computed(() =>
  units.value
    .map((u, index) => ({ u, index }))
    .filter(({ u }) => editor.save.isUndeployed(u))
)

/** 未被任何机体占用的驾驶员（可拖到机体上） */
const freePilots = computed(() => {
  const used = new Set(units.value.map((u) => u.characterId).filter((id) => id > 0))
  return characters.value.filter((id) => !used.has(id))
})

const pilotOptions = computed(() => [
  { value: 0, label: t('formation.noPilot') },
  ...characters.value.map((id) => ({
    value: id,
    label: characterById(gameData, id)?.name ?? `#${id}`
  }))
])

function unitLevel(u: UnitEntry): number {
  return editor.save?.unitLevelOf(gameData, u) ?? 0
}
function pilotLevelOf(characterId: number): number {
  if (!editor.save || !characterId) return 0
  const idx = editor.save.characters.indexOf(characterId)
  if (idx < 0) return 0
  return characterLevelForExp(editor.save.characterExps[idx] ?? 0)
}
function wrap(fn: () => void): void {
  try {
    editor.markDirty(fn)
  } catch (e) {
    ElMessage.error(translateError(e))
  }
}

function cellUnitIndex(row: number, col: number): number {
  return editor.save?.unitAt(row, col) ?? -1
}

function selectFocus(index: number, focus: 'unit' | 'pilot'): void {
  selectedUnit.value = index
  selectedFreePilot.value = null
  detailFocus.value = focus
}

function selectFreePilot(id: number): void {
  selectedFreePilot.value = id
  selectedUnit.value = null
  detailFocus.value = 'pilot'
}

function undeploySelected(): void {
  if (selectedUnit.value === null) return
  wrap(() => editor.save!.undeployUnit(selectedUnit.value!))
}

function setPilot(characterId: number | undefined | null): void {
  if (selectedUnit.value === null || characterId === undefined || characterId === null) return
  wrap(() => editor.save!.setUnitPilot(selectedUnit.value!, characterId))
}

const selected = computed(() =>
  selectedUnit.value === null ? null : units.value[selectedUnit.value] ?? null
)

const selectedType = computed(() =>
  selected.value ? unitTypeById(gameData, selected.value.unitType) : undefined
)

const selectedLevel = computed(() => (selected.value ? unitLevel(selected.value) : 0))

const selectedPilot = computed(() => {
  if (selectedFreePilot.value) return characterById(gameData, selectedFreePilot.value)
  const id = selected.value?.characterId ?? 0
  return id ? characterById(gameData, id) : undefined
})

const selectedPilotLevel = computed(() => {
  const id = selectedFreePilot.value ?? selected.value?.characterId ?? 0
  return id ? pilotLevelOf(id) : 0
})

const selectedWeapons = computed(() => {
  const ut = selectedType.value
  if (!ut) return []
  return [ut.weapon1, ut.weapon2]
    .filter((id): id is number => !!id && id > 0)
    .map((id) => weaponById(gameData, id))
    .filter(Boolean)
})

const selectedAbilities = computed(() => {
  const ut = selectedType.value
  if (!ut) return []
  return [ut.ability1, ut.ability2, ut.ability3]
    .filter((id): id is number => !!id && id > 0)
    .map((id) => abilityById(gameData, id))
    .filter(Boolean)
})

const selectedItems = computed(() => {
  if (!selected.value) return []
  void invTick.value
  return selected.value.items
    .map((id, slot) => ({ id, slot, entry: itemById(gameData, id) }))
    .filter((x) => x.id > 0)
})

const inventoryItems = computed(() => {
  if (!editor.save) return []
  void invTick.value
  const stock = editor.save.docPlayerItems()
  return gameData.items.map((it) => ({
    ...it,
    stock: stock[it.id - 1] ?? 0
  }))
})

const selectedItemSlots = computed(() =>
  selected.value ? itemSlotsForUnitType(gameData, selected.value.unitType) : 2
)

const canEquipMore = computed(() => {
  if (!selected.value) return false
  void invTick.value
  return selected.value.items.filter((x) => x > 0).length < selectedItemSlots.value
})

const emptyItemSlots = computed(() => {
  void invTick.value
  const used = selectedItems.value.length
  return Math.max(0, selectedItemSlots.value - used)
})

function equip(itemId: number): void {
  if (selectedUnit.value === null) return
  try {
    editor.markDirty(() => editor.save.equipItem(selectedUnit.value!, itemId, gameData))
    invTick.value++
  } catch (e) {
    ElMessage.error(translateError(e))
  }
}

function unequip(slot: number): void {
  if (selectedUnit.value === null) return
  try {
    editor.markDirty(() => editor.save.unequipItem(selectedUnit.value!, slot))
    invTick.value++
  } catch (e) {
    ElMessage.error(translateError(e))
  }
}

const selectedSkills = computed(() => {
  const c = selectedPilot.value
  if (!c?.skills?.length) return []
  return c.skills.map((id) => skillById(gameData, id)).filter(Boolean)
})

const selectedTalents = computed(() => {
  const c = selectedPilot.value
  if (!c?.talents?.length) return []
  const unique = [...new Set(c.talents)]
  return unique.map((id) => talentById(gameData, id)).filter(Boolean)
})

function onUnitDragStart(ev: DragEvent, index: number): void {
  dragPayload.value = { kind: 'unit', index }
  if (ev.dataTransfer) {
    ev.dataTransfer.setData('text/plain', `u:${index}`)
    ev.dataTransfer.effectAllowed = 'copyMove'
  }
  selectedUnit.value = index
  selectedFreePilot.value = null
  detailFocus.value = 'unit'
}

function onPilotDragStart(ev: DragEvent, characterId: number): void {
  dragPayload.value = { kind: 'pilot', id: characterId }
  if (ev.dataTransfer) {
    ev.dataTransfer.setData('text/plain', `p:${characterId}`)
    ev.dataTransfer.effectAllowed = 'copyMove'
  }
  selectFreePilot(characterId)
}

function readDrag(ev: DragEvent): DragPayload | null {
  if (dragPayload.value) return dragPayload.value
  const plain = ev.dataTransfer?.getData('text/plain') ?? ''
  if (plain.startsWith('u:')) {
    const n = Number(plain.slice(2))
    if (Number.isInteger(n)) return { kind: 'unit', index: n }
  }
  if (plain.startsWith('p:')) {
    const n = Number(plain.slice(2))
    if (Number.isInteger(n) && n > 0) return { kind: 'pilot', id: n }
  }
  return null
}

function assignPilotToUnit(unitIndex: number, characterId: number): void {
  wrap(() => editor.save!.setUnitPilot(unitIndex, characterId))
  selectFocus(unitIndex, 'pilot')
}

function allowDrop(ev: DragEvent, effect: 'copy' | 'move' = 'copy'): void {
  ev.preventDefault()
  ev.stopPropagation()
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = effect
}

function onCellDragOver(ev: DragEvent, row: number, col: number): void {
  allowDrop(ev, dragPayload.value?.kind === 'unit' ? 'move' : 'copy')
  dragOverCell.value = `${row}-${col}`
}

function onCellDrop(ev: DragEvent, row: number, col: number): void {
  ev.preventDefault()
  ev.stopPropagation()
  dragOverCell.value = null
  if (!editor.save) return
  const drag = readDrag(ev)
  dragPayload.value = null
  if (!drag) return
  const idx = cellUnitIndex(row, col)
  if (drag.kind === 'unit') {
    wrap(() => editor.save!.deployUnit(drag.index, row, col))
    selectFocus(drag.index, 'unit')
    return
  }
  if (idx < 0) {
    ElMessage.warning(t('formation.dropPilotNeedUnit'))
    return
  }
  assignPilotToUnit(idx, drag.id)
}

function onUnitDropTargetOver(ev: DragEvent, unitIndex: number): void {
  allowDrop(ev, 'copy')
  dragOverUnitIdx.value = unitIndex
}

function onUnitDropPilot(ev: DragEvent, unitIndex: number): void {
  ev.preventDefault()
  ev.stopPropagation()
  dragOverUnitIdx.value = null
  const drag = readDrag(ev)
  dragPayload.value = null
  if (!drag) return
  if (drag.kind === 'pilot') {
    assignPilotToUnit(unitIndex, drag.id)
    return
  }
  // 机体拖到另一机体格：走格子坐标
}

function onBenchDragOver(ev: DragEvent): void {
  allowDrop(ev, 'move')
  dragOverBench.value = true
}

function onBenchDrop(ev: DragEvent): void {
  ev.preventDefault()
  dragOverBench.value = false
  if (!editor.save) return
  const drag = readDrag(ev)
  dragPayload.value = null
  if (!drag || drag.kind !== 'unit') return
  const u = units.value[drag.index]
  if (!u || editor.save.isUndeployed(u)) {
    selectFocus(drag.index, 'unit')
    return
  }
  wrap(() => editor.save!.undeployUnit(drag.index))
  selectFocus(drag.index, 'unit')
}

function clearDragOver(): void {
  dragOverCell.value = null
  dragOverBench.value = false
  dragOverUnitIdx.value = null
}

function onDragEnd(): void {
  clearDragOver()
  // drop 可能在 dragend 之后同一轮才读到 payload，延后清理
  setTimeout(() => {
    dragPayload.value = null
  }, 0)
}

function unitAtCell(row: number, col: number): UnitEntry | null {
  const idx = cellUnitIndex(row, col)
  return idx >= 0 ? units.value[idx] : null
}

function typeName(typeId: number): string {
  return unitTypeById(gameData, typeId)?.name ?? `#${typeId}`
}
</script>

<template>
  <div v-if="editor.save" class="formation">
    <header class="top">
      <div class="brand">
        <span class="brand-cn">{{ t('tabs.formation') }}</span>
        <span class="brand-en">FORMATION</span>
      </div>
      <p class="hint">{{ t('formation.hint') }}</p>
      <div class="toolbar">
        <button
          type="button"
          class="tool-btn"
          :disabled="selectedUnit === null || !!(selected && editor.save.isUndeployed(selected))"
          @click="undeploySelected()"
        >
          {{ t('formation.undeploy') }}
        </button>
        <el-select
          v-if="selectedUnit !== null"
          class="pilot-select"
          size="small"
          :model-value="selected!.characterId"
          :placeholder="t('formation.pilot')"
          @change="setPilot"
        >
          <el-option v-for="o in pilotOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
    </header>

    <div class="main">
      <div class="board">
        <div class="grid-wrap">
          <div class="col-head">
            <span class="corner" />
            <span v-for="c in cols" :key="'h' + c" class="axis">{{ c }}</span>
          </div>
          <div v-for="r in rows" :key="'r' + r" class="grid-row">
            <span class="axis row-axis">{{ r }}</span>
            <div
              v-for="c in cols"
              :key="r + '-' + c"
              class="cell"
              :class="{
                filled: cellUnitIndex(r, c) >= 0,
                active: selectedUnit !== null && cellUnitIndex(r, c) === selectedUnit,
                over: dragOverCell === r + '-' + c || dragOverUnitIdx === cellUnitIndex(r, c)
              }"
              @dragover="onCellDragOver($event, r, c)"
              @drop="onCellDrop($event, r, c)"
            >
              <template v-if="unitAtCell(r, c)">
                <div
                  class="pair"
                  :class="{ 'pilot-drop': dragOverUnitIdx === cellUnitIndex(r, c) }"
                  draggable="true"
                  @dragstart="onUnitDragStart($event, cellUnitIndex(r, c))"
                  @dragend="onDragEnd"
                  @dragover="onUnitDropTargetOver($event, cellUnitIndex(r, c))"
                  @drop.stop="onUnitDropPilot($event, cellUnitIndex(r, c))"
                >
                  <button
                    type="button"
                    class="thumb unit-thumb"
                    :class="{ focus: selectedUnit === cellUnitIndex(r, c) && detailFocus === 'unit' }"
                    @click.stop="selectFocus(cellUnitIndex(r, c), 'unit')"
                    @dragover="onUnitDropTargetOver($event, cellUnitIndex(r, c))"
                    @drop.stop="onUnitDropPilot($event, cellUnitIndex(r, c))"
                  >
                    <img :src="gameImage(`unit-${unitAtCell(r, c)!.unitType}`)" alt="" draggable="false" />
                    <span class="badge">+{{ unitLevel(unitAtCell(r, c)!) }}</span>
                  </button>
                  <button
                    type="button"
                    class="thumb pilot-thumb"
                    :class="{
                      empty: !unitAtCell(r, c)!.characterId,
                      focus: selectedUnit === cellUnitIndex(r, c) && detailFocus === 'pilot'
                    }"
                    @click.stop="selectFocus(cellUnitIndex(r, c), 'pilot')"
                    @dragover="onUnitDropTargetOver($event, cellUnitIndex(r, c))"
                    @drop.stop="onUnitDropPilot($event, cellUnitIndex(r, c))"
                  >
                    <img
                      v-if="unitAtCell(r, c)!.characterId"
                      :src="gameImage(`portrait-${unitAtCell(r, c)!.characterId}`)"
                      alt=""
                      draggable="false"
                    />
                    <span v-else class="no-pilot">!</span>
                    <span v-if="unitAtCell(r, c)!.characterId" class="badge lv">
                      Lv{{ pilotLevelOf(unitAtCell(r, c)!.characterId) }}
                    </span>
                  </button>
                </div>
              </template>
              <span v-else class="empty">{{ t('formation.empty') }}</span>
            </div>
          </div>
        </div>

        <div class="bench-label">{{ t('formation.benchUnits', undeployed.length) }}</div>
        <div
          class="bench"
          :class="{ over: dragOverBench }"
          @dragover="onBenchDragOver"
          @dragleave="clearDragOver"
          @drop="onBenchDrop"
        >
          <div
            v-for="{ u, index } in undeployed"
            :key="'b' + index"
            class="bench-unit"
            :class="{
              active: selectedUnit === index,
              'pilot-drop': dragOverUnitIdx === index
            }"
            draggable="true"
            @dragstart="onUnitDragStart($event, index)"
            @dragend="onDragEnd"
            @dragover="onUnitDropTargetOver($event, index)"
            @drop.stop="onUnitDropPilot($event, index)"
          >
            <button
              type="button"
              class="thumb unit-only"
              :class="{ focus: selectedUnit === index && detailFocus === 'unit' }"
              @click.stop="selectFocus(index, 'unit')"
              @dragover="onUnitDropTargetOver($event, index)"
              @drop.stop="onUnitDropPilot($event, index)"
            >
              <img :src="gameImage(`unit-${u.unitType}`)" alt="" draggable="false" />
              <span class="badge">+{{ unitLevel(u) }}</span>
            </button>
            <div class="bench-meta">
              <div class="bench-name">{{ typeName(u.unitType) }}</div>
              <div class="bench-sub" :class="{ warn: !u.characterId }">
                {{
                  u.characterId
                    ? characterById(gameData, u.characterId)?.name
                    : t('formation.needPilot')
                }}
              </div>
            </div>
          </div>
          <span v-if="!undeployed.length" class="dim">{{ t('formation.allDeployed') }}</span>
        </div>

        <div class="bench-label">{{ t('formation.benchPilots', freePilots.length) }}</div>
        <div class="bench pilots">
          <button
            v-for="id in freePilots"
            :key="'p' + id"
            type="button"
            class="bench-pilot"
            :class="{ active: selectedFreePilot === id }"
            draggable="true"
            @dragstart="onPilotDragStart($event, id)"
            @dragend="onDragEnd"
            @click="selectFreePilot(id)"
          >
            <img :src="gameImage(`portrait-${id}`)" alt="" />
            <span class="lv-chip">Lv{{ pilotLevelOf(id) }}</span>
            <span class="pilot-name">{{ characterById(gameData, id)?.name ?? `#${id}` }}</span>
          </button>
          <span v-if="!freePilots.length" class="dim">{{ t('formation.noFreePilots') }}</span>
        </div>
      </div>

      <aside class="detail">
        <template v-if="selected && selectedType && detailFocus === 'unit'">
          <div class="hero solo">
            <div class="hero-unit big">
              <img :src="gameImage(`unit-${selected.unitType}`)" alt="" />
              <span class="badge">+{{ selectedLevel }}</span>
            </div>
          </div>
          <h3 class="detail-title">{{ selectedType.name }}</h3>
          <p class="focus-tag">{{ t('formation.focusUnit') }}</p>
          <p v-if="selectedType.info && selectedType.info !== '无'" class="blurb">{{ selectedType.info }}</p>

          <div class="stat-chips">
            <span class="chip">HP {{ selectedType.hp ?? '—' }}</span>
            <span class="chip">EN {{ selectedType.en ?? '—' }}</span>
            <span class="chip">{{ t('formation.statAgility') }} {{ selectedType.agility ?? '—' }}</span>
            <span class="chip">{{ t('formation.statMove') }} {{ selectedType.move ?? '—' }}</span>
            <span class="chip">{{ t('formation.statLimit') }} {{ selectedType.limit ?? '—' }}</span>
          </div>

          <section class="sec">
            <h4>{{ t('formation.secWeapons') }}</h4>
            <ul v-if="selectedWeapons.length" class="list">
              <li v-for="w in selectedWeapons" :key="'w' + w!.id">
                <strong>{{ w!.name }}</strong>
                <span class="meta">DMG {{ w!.damage }} · HIT {{ w!.hit }} · EN {{ w!.en }} · RNG {{ w!.rangeMin }}-{{ w!.rangeMax }}</span>
                <div v-if="w!.info" class="info">{{ w!.info }}</div>
              </li>
            </ul>
            <p v-else class="dim">{{ t('formation.none') }}</p>
          </section>

          <section class="sec">
            <h4>{{ t('formation.secAbilities') }}</h4>
            <ul v-if="selectedAbilities.length" class="list">
              <li v-for="a in selectedAbilities" :key="'a' + a!.id">
                <strong>{{ a!.name }}</strong>
                <div v-if="a!.info" class="info">{{ a!.info }}</div>
              </li>
            </ul>
            <p v-else class="dim">{{ t('formation.none') }}</p>
          </section>

          <section class="sec items-sec">
            <h4>{{ t('formation.secItems') }}（{{ selectedItems.length }}/{{ selectedItemSlots }}）</h4>
            <div class="equip-slots">
              <div v-for="it in selectedItems" :key="'eq-' + it.slot" class="equip-slot filled">
                <img :src="gameImage(`item-${it.id}`)" alt="" />
                <div class="equip-meta">
                  <strong>{{ it.entry?.name ?? `#${it.id}` }}</strong>
                  <button type="button" class="mini-btn" @click="unequip(it.slot)">{{ t('formation.unequip') }}</button>
                </div>
              </div>
              <div v-for="n in emptyItemSlots" :key="'empty-' + n" class="equip-slot empty-slot">
                {{ t('formation.emptySlot') }}
              </div>
            </div>

            <h4 class="sub">{{ t('formation.inventory') }}</h4>
            <div class="inv-grid">
              <button
                v-for="it in inventoryItems"
                :key="'inv-' + it.id"
                type="button"
                class="inv-card"
                :disabled="!canEquipMore || it.stock <= 0"
                :title="it.info || it.name"
                @click="equip(it.id)"
              >
                <img :src="gameImage(`item-${it.id}`)" alt="" />
                <span class="inv-name">{{ it.name }}</span>
                <span class="inv-stock">×{{ it.stock }}</span>
                <span class="inv-action">{{ t('formation.equip') }}</span>
              </button>
            </div>
          </section>
        </template>

        <template v-else-if="(selected || selectedFreePilot) && detailFocus === 'pilot'">
          <div class="hero solo">
            <div class="hero-pilot big" :class="{ empty: !selectedPilot }">
              <img v-if="selectedPilot" :src="gameImage(`portrait-${selectedPilot.id}`)" alt="" />
              <span v-else class="no-pilot">{{ t('formation.noPilot') }}</span>
              <span v-if="selectedPilot" class="badge lv">Lv{{ selectedPilotLevel }}</span>
            </div>
          </div>
          <h3 class="detail-title">{{ selectedPilot?.name ?? t('formation.noPilot') }}</h3>
          <p class="focus-tag">{{ t('formation.focusPilot') }}</p>
          <p v-if="selectedPilot?.info" class="blurb">{{ selectedPilot.info }}</p>

          <template v-if="selectedPilot">
            <div class="stat-chips">
              <span class="chip">{{ t('formation.statShoot') }} {{ selectedPilot.shoot ?? '—' }}</span>
              <span class="chip">{{ t('formation.statManeuver') }} {{ selectedPilot.maneuver ?? '—' }}</span>
              <span class="chip">{{ t('formation.statCommand') }} {{ selectedPilot.command ?? '—' }}</span>
              <span class="chip">SP {{ selectedPilot.sp ?? '—' }}</span>
              <span class="chip">{{ t('formation.statMelee') }} {{ selectedPilot.melee ?? '—' }}</span>
              <span class="chip">{{ t('formation.statReaction') }} {{ selectedPilot.reaction ?? '—' }}</span>
            </div>

            <section class="sec">
              <h4>{{ t('formation.secSkills') }}</h4>
              <ul v-if="selectedSkills.length" class="list">
                <li v-for="s in selectedSkills" :key="'s' + s!.id">
                  <strong>{{ s!.name }}</strong>
                  <span class="meta">SP {{ s!.sp }}</span>
                  <div v-if="s!.info" class="info">{{ s!.info }}</div>
                </li>
              </ul>
              <p v-else class="dim">{{ t('formation.none') }}</p>
            </section>

            <section class="sec">
              <h4>{{ t('formation.secTalents') }}</h4>
              <ul v-if="selectedTalents.length" class="list">
                <li v-for="tal in selectedTalents" :key="'t' + tal!.id">
                  <strong>{{ tal!.name }}</strong>
                  <div v-for="(inf, ti) in tal!.infos" :key="ti" class="info">{{ inf }}</div>
                </li>
              </ul>
              <p v-else class="dim">{{ t('formation.none') }}</p>
            </section>
          </template>
          <p v-else class="warn">{{ t('formation.noPilot') }}</p>
        </template>

        <p v-else class="dim pad">{{ t('formation.detailEmpty') }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.formation {
  --panel: #ffffff;
  --panel-2: #f5f7fa;
  --line: #e4e7ed;
  --text: #303133;
  --muted: #909399;
  --accent: #409eff;
  --accent-soft: rgba(64, 158, 255, 0.18);
  --warn: #f56c6c;
  --ok: #67c23a;
  color: var(--text);
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: baseline; gap: 10px; }
.brand-cn { font-size: 18px; font-weight: 700; }
.brand-en {
  font-size: 12px; font-weight: 700; color: var(--accent);
  letter-spacing: 0.14em;
}
.hint { flex: 1; margin: 0; font-size: 12px; color: var(--muted); min-width: 200px; }
.toolbar { display: flex; gap: 10px; align-items: center; }
.tool-btn {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.tool-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.tool-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.pilot-select { width: 180px; }

.main { display: flex; gap: 14px; align-items: flex-start; }
.board { flex: 1; min-width: 0; overflow-x: auto; }

.grid-wrap { display: inline-block; margin-bottom: 12px; }
.col-head, .grid-row { display: flex; align-items: stretch; }
.corner { width: 28px; }
.axis {
  width: 148px; text-align: center; font-size: 11px; color: var(--muted);
  padding: 2px 0;
}
.row-axis {
  width: 28px; display: flex; align-items: center; justify-content: center;
}

.cell {
  width: 148px; height: 104px; margin: 4px; padding: 6px;
  box-sizing: border-box;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fafafa;
  display: flex; align-items: center; justify-content: center;
}
.cell.filled {
  border-style: solid;
  border-color: var(--line);
  background: var(--panel);
}
.cell.active {
  border-color: #a0cfff;
  box-shadow: 0 0 0 1px #a0cfff;
}
.cell.over {
  border-color: var(--ok);
  background: #f0f9eb;
}
.empty { color: #c0c4cc; font-size: 13px; letter-spacing: 0.2em; }

.pair {
  display: flex; gap: 6px; width: 100%; height: 100%;
  cursor: grab; align-items: stretch;
}
.pair:active { cursor: grabbing; }

.thumb {
  position: relative; flex: 1; min-width: 0;
  border: 1px solid var(--line); border-radius: 6px;
  background: #f5f7fa; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  padding: 0; cursor: pointer;
}
.thumb:hover { border-color: var(--accent); }
.thumb.focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.thumb img {
  width: 100%; height: 100%; object-fit: contain;
  image-rendering: pixelated;
}
.thumb.empty { border-color: var(--warn); }
.no-pilot {
  color: var(--warn); font-size: 14px; font-weight: 700;
  padding: 0 4px; text-align: center; line-height: 1.2;
}
.badge {
  position: absolute; left: 3px; bottom: 3px;
  font-size: 11px; font-weight: 700; line-height: 1;
  padding: 2px 5px; border-radius: 3px;
  background: rgba(255, 255, 255, 0.92); color: var(--accent);
  border: 1px solid var(--line);
}
.badge.lv { left: auto; right: 3px; color: #7c6bc4; }

.pair.pilot-drop,
.bench-unit.pilot-drop {
  outline: 2px solid var(--ok);
  outline-offset: 1px;
  background: #f0f9eb;
}

.bench-label {
  margin: 10px 0 8px; font-size: 13px; color: var(--muted);
}
.bench {
  display: flex; flex-wrap: wrap; gap: 10px;
  min-height: 88px; padding: 10px;
  border: 1px dashed #dcdfe6; border-radius: 8px;
  background: #fafafa;
}
.bench.over { border-color: var(--ok); background: #f0f9eb; }
.bench-unit {
  display: flex; gap: 8px; align-items: center;
  min-width: 180px; max-width: 220px; height: 84px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--panel); cursor: grab;
}
.bench-unit.active { border-color: var(--accent); }
.thumb.unit-only {
  width: 68px; height: 68px; flex: 0 0 68px;
}
.bench-meta { min-width: 0; flex: 1; }
.bench-name {
  font-size: 13px; font-weight: 600; line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bench-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
.bench-sub.warn { color: var(--warn); }

.bench.pilots { min-height: 96px; align-items: stretch; }
.bench-pilot {
  width: 76px; padding: 6px 4px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--panel); cursor: grab;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.bench-pilot.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.bench-pilot img {
  width: 56px; height: 56px; flex: 0 0 56px;
  object-fit: contain;
  image-rendering: pixelated;
}
.bench-pilot .lv-chip {
  flex: 0 0 auto;
  font-size: 11px; font-weight: 700; line-height: 1;
  padding: 2px 6px; border-radius: 3px;
  border: 1px solid var(--line);
  background: #fff; color: #7c6bc4;
}
.bench-pilot .pilot-name {
  width: 100%;
  font-size: 10px; color: var(--muted); line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: center;
}
.detail {
  width: 340px; flex-shrink: 0;
  max-height: calc(100vh - 160px); overflow: auto;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 12px; background: var(--panel);
}
.hero {
  display: grid; grid-template-columns: 1.25fr 1fr; gap: 10px;
  margin-bottom: 10px;
}
.hero.solo { grid-template-columns: 1fr; }
.hero-unit, .hero-pilot {
  position: relative;
  border: 1px solid var(--line); border-radius: 8px;
  background: #f5f7fa;
  aspect-ratio: 1; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.hero-unit.big, .hero-pilot.big { max-width: 220px; margin: 0 auto; width: 100%; }
.hero-unit img, .hero-pilot img {
  width: 100%; height: 100%; object-fit: contain;
  image-rendering: pixelated;
}
.hero-pilot.empty { border-color: var(--warn); }
.detail-title { margin: 0 0 2px; font-size: 18px; font-weight: 700; }
.focus-tag { margin: 0 0 8px; font-size: 12px; color: var(--accent); font-weight: 600; }
.pilot-line { margin: 0 0 8px; font-size: 13px; color: var(--accent); }
.blurb { margin: 0 0 10px; font-size: 12px; color: var(--muted); line-height: 1.45; }
.stat-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chip {
  font-size: 11px; padding: 3px 7px; border-radius: 4px;
  background: var(--panel-2); border: 1px solid var(--line); color: var(--text);
}
.sec { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); }
.sec h4, .sub {
  margin: 0 0 6px; font-size: 12px; color: var(--accent);
  font-weight: 700;
}
.sub { margin-top: 10px; color: var(--muted); }
.list { list-style: none; margin: 0; padding: 0; }
.list li { margin-bottom: 8px; font-size: 12px; }
.list .meta { display: block; color: var(--muted); margin-top: 2px; }
.list .info { color: #606266; margin-top: 2px; line-height: 1.4; }
.item-row { display: flex; gap: 8px; align-items: flex-start; }
.item-body { flex: 1; min-width: 0; }
.item-img { width: 28px; height: 28px; image-rendering: pixelated; flex-shrink: 0; }
.mini-btn {
  flex-shrink: 0; border: 1px solid var(--line); background: #fff; color: var(--accent);
  border-radius: 4px; padding: 2px 8px; font-size: 12px; cursor: pointer;
}
.mini-btn:hover:not(:disabled) { border-color: var(--accent); }
.mini-btn:disabled { opacity: 0.4; cursor: not-allowed; color: var(--muted); }

.equip-slots { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.equip-slot {
  display: flex; gap: 8px; align-items: center;
  border: 1px dashed var(--line); border-radius: 6px; padding: 6px 8px; background: #fafafa;
}
.equip-slot.filled { border-style: solid; background: #fff; }
.equip-slot img { width: 32px; height: 32px; image-rendering: pixelated; }
.equip-meta { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.empty-slot { color: var(--muted); font-size: 12px; justify-content: center; min-height: 44px; }

.inv-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  max-height: 280px; overflow: auto; padding: 2px;
}
.inv-card {
  display: grid; grid-template-columns: 28px 1fr; grid-template-rows: auto auto;
  column-gap: 6px; row-gap: 2px; align-items: center;
  text-align: left; padding: 6px; border: 1px solid var(--line); border-radius: 6px;
  background: #fff; cursor: pointer; color: var(--text);
}
.inv-card img { width: 28px; height: 28px; grid-row: 1 / span 2; image-rendering: pixelated; }
.inv-name { font-size: 11px; font-weight: 600; line-height: 1.2; }
.inv-stock { font-size: 10px; color: var(--muted); }
.inv-action { grid-column: 2; font-size: 11px; color: var(--accent); }
.inv-card:hover:not(:disabled) { border-color: var(--accent); }
.inv-card:disabled { opacity: 0.4; cursor: not-allowed; }
.inv-card:disabled .inv-action { color: var(--muted); }
.dim { color: var(--muted); font-size: 12px; }
.warn { color: var(--warn); font-size: 12px; margin: 0; }
.pad { padding: 24px 8px; text-align: center; }
</style>
