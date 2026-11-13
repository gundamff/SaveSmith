<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { locale, t } from '@host/i18n'
import { getPbzCodexEnemyById, pbzCodexEnemyName } from '../catalog/codexEnemies'
import { pbzCodexBookName, type PbzCodexBookKind } from '../catalog/codexBooks'
import { pbzCodexMemoryName, type PbzCodexMemoryKind } from '../catalog/codexMemories'
import {
  listPbzCodexMapsUsedByEnemies,
  pbzCodexMapName,
  normalizePbzCodexMapId
} from '../catalog/codexMaps'
import {
  clearAllCodexBooks,
  clearAllCodexMemories,
  clearCodexDiscovered,
  clearCodexRevealed,
  isEditableSlotName,
  projectCodex,
  projectCodexBooks,
  projectCodexMemories,
  setCodexBookOwned,
  setCodexDiscovered,
  setCodexMemoryOwned,
  setCodexRevealed,
  unlockAllCodex,
  unlockAllCodexBooks,
  unlockAllCodexDiscovered,
  unlockAllCodexMemories,
  unlockAllCodexRevealed,
  type PbzLiteratureRowView
} from '../model/saveModel'
import { usePbzEditor } from './inject'
import { reconcileSlotSelection, requestSlotSelection } from './slotSelection'

type CodexCategory = 'enemies' | 'books' | 'memories'
type StatusFilter = 'all' | 'missing' | 'discovered-only' | 'complete' | 'owned' | 'unowned'
type EnemyKindFilter = 'all' | 'boss' | 'normal'

interface LitTreeRow extends PbzLiteratureRowView {
  children?: LitTreeRow[]
}

const editor = usePbzEditor()
const category = ref<CodexCategory>('enemies')
const filter = ref('')
const statusFilter = ref<StatusFilter>('all')
const kindFilter = ref<EnemyKindFilter>('all')
const mapFilter = ref('all')
const selectedSlotName = ref(editor.save.model.selectedSlotName ?? '')

watch(
  () => editor.rev,
  () => {
    selectedSlotName.value = reconcileSlotSelection(editor.save.model, selectedSlotName.value)
  },
  { flush: 'sync' }
)

watch(category, () => {
  filter.value = ''
  statusFilter.value = 'all'
  kindFilter.value = 'all'
  mapFilter.value = 'all'
})

const lang = computed(() => (locale.value === 'en' ? 'en' : 'zh'))

const editableSlots = computed(() => {
  void editor.rev
  return editor.save.model.slots.filter(({ name }) => isEditableSlotName(name))
})

const selectedSlot = computed(() => {
  void editor.rev
  return editor.save.model.slots.find(({ name }) => name === selectedSlotName.value) ?? null
})

const enemyView = computed(() => {
  void editor.rev
  return projectCodex(editor.save.model)
})

const bookView = computed(() => {
  void editor.rev
  return selectedSlot.value ? projectCodexBooks(selectedSlot.value) : null
})

const memoryView = computed(() => {
  void editor.rev
  return selectedSlot.value ? projectCodexMemories(selectedSlot.value) : null
})

const litView = computed(() => (category.value === 'books' ? bookView.value : memoryView.value))

const mapOptions = computed(() => {
  const ids =
    category.value === 'enemies'
      ? (enemyView.value?.rows ?? []).map((row) => row.ownMapId)
      : (litView.value?.rows ?? []).map((row) => row.ownMapId)
  return listPbzCodexMapsUsedByEnemies(ids)
})

const isFiltering = computed(
  () => filter.value.trim() !== '' || statusFilter.value !== 'all' || mapFilter.value !== 'all'
)

/** Unfiltered owned/total child counts per parent id, for the "x/y" sub-progress badge. */
const litChildStats = computed<Map<string, { owned: number; total: number }>>(() => {
  const rows = litView.value?.rows ?? []
  const childKind = category.value === 'books' ? 'page' : 'petal'
  const stats = new Map<string, { owned: number; total: number }>()
  for (const row of rows) {
    if (row.kind !== childKind || !row.parentId) continue
    const stat = stats.get(row.parentId) ?? { owned: 0, total: 0 }
    stat.total += 1
    if (row.owned) stat.owned += 1
    stats.set(row.parentId, stat)
  }
  return stats
})

function childStats(id: string): { owned: number; total: number } | null {
  return litChildStats.value.get(id) ?? null
}

// Force el-table remount so default-expand-all re-applies while searching.
const treeKey = computed(() => `${category.value}:${isFiltering.value}`)

const enemyRows = computed(() => {
  const base = enemyView.value?.rows ?? []
  const needle = filter.value.trim().toLocaleLowerCase()
  const mapWanted =
    mapFilter.value === 'all' ? null : normalizePbzCodexMapId(mapFilter.value).toLowerCase()
  return base.filter((row) => {
    if (kindFilter.value === 'boss' && !row.isBoss) return false
    if (kindFilter.value === 'normal' && row.isBoss) return false
    if (statusFilter.value === 'missing' && row.discovered) return false
    if (statusFilter.value === 'discovered-only' && !(row.discovered && !row.revealed)) return false
    if (statusFilter.value === 'complete' && !(row.discovered && row.revealed)) return false
    if (mapWanted && normalizePbzCodexMapId(row.ownMapId).toLowerCase() !== mapWanted) return false
    if (!needle) return true
    const catalog = getPbzCodexEnemyById(row.id)
    const displayName = catalog ? pbzCodexEnemyName(catalog, lang.value) : row.zh
    const mapLabel = pbzCodexMapName(row.ownMapId, lang.value)
    return [displayName, row.zh, row.zhRevealed, row.id, row.ownMapId, row.enemyType, mapLabel].some(
      (v) => v.toLocaleLowerCase().includes(needle)
    )
  })
})

function litDisplayNameFor(row: PbzLiteratureRowView): string {
  if (category.value === 'books') {
    return pbzCodexBookName(
      {
        id: row.id,
        zh: row.zh,
        en: row.en,
        ownMapId: row.ownMapId,
        parentId: row.parentId,
        displayOrder: row.displayOrder,
        kind: row.kind as PbzCodexBookKind
      },
      lang.value
    )
  }
  return pbzCodexMemoryName(
    {
      id: row.id,
      zh: row.zh,
      en: row.en,
      ownMapId: row.ownMapId,
      parentId: row.parentId,
      displayOrder: row.displayOrder,
      isWhiteFlower: false,
      kind: row.kind as PbzCodexMemoryKind
    },
    lang.value
  )
}

/** Search/status predicate used for a single literature row. */
function litRowMatches(row: PbzLiteratureRowView): boolean {
  if (statusFilter.value === 'owned' && !row.owned) return false
  if (statusFilter.value === 'unowned' && row.owned) return false
  const needle = filter.value.trim().toLocaleLowerCase()
  if (!needle) return true
  const mapLabel = pbzCodexMapName(row.ownMapId, lang.value)
  return [litDisplayNameFor(row), row.zh, row.en, row.id, row.ownMapId, row.parentId, mapLabel].some(
    (v) => v.toLocaleLowerCase().includes(needle)
  )
}

const litTree = computed<LitTreeRow[]>(() => {
  const rows = litView.value?.rows ?? []
  const parentKind = category.value === 'books' ? 'book' : 'flower'
  const childKind = category.value === 'books' ? 'page' : 'petal'

  const parents = rows.filter((row) => row.kind === parentKind)
  const parentIds = new Set(parents.map((p) => p.id))
  const childrenByParent = new Map<string, PbzLiteratureRowView[]>()
  const orphans: PbzLiteratureRowView[] = []
  for (const row of rows) {
    if (row.kind !== childKind) continue
    if (row.parentId && parentIds.has(row.parentId)) {
      const list = childrenByParent.get(row.parentId) ?? []
      list.push(row)
      childrenByParent.set(row.parentId, list)
    } else {
      orphans.push(row)
    }
  }

  const mapWanted =
    mapFilter.value === 'all' ? null : normalizePbzCodexMapId(mapFilter.value).toLowerCase()
  const parentMatchesMap = (row: PbzLiteratureRowView): boolean =>
    !mapWanted || normalizePbzCodexMapId(row.ownMapId).toLowerCase() === mapWanted

  const tree: LitTreeRow[] = []
  for (const parent of parents) {
    if (!parentMatchesMap(parent)) continue
    const kids = (childrenByParent.get(parent.id) ?? []).filter((k) => litRowMatches(k))
    const parentOk = litRowMatches(parent)
    if (parentOk || kids.length > 0) {
      tree.push({ ...parent, children: kids })
    }
  }
  for (const orphan of orphans) {
    if (parentMatchesMap(orphan) && litRowMatches(orphan)) tree.push({ ...orphan })
  }
  return tree
})

function changeSlot(targetSlotName: string): void {
  if (
    requestSlotSelection(
      editor.save.model,
      targetSlotName,
      (message) => window.confirm(message),
      t('pbz.codex.slotDirty')
    )
  ) {
    selectedSlotName.value = targetSlotName
  }
}

function enemyDisplayName(id: string): string {
  const catalog = getPbzCodexEnemyById(id)
  return catalog ? pbzCodexEnemyName(catalog, lang.value) : id
}

function litDisplayName(id: string): string {
  const row = litView.value?.rows.find((r) => r.id === id)
  return row ? litDisplayNameFor(row) : id
}

function mapDisplayName(mapId: string): string {
  return pbzCodexMapName(mapId, lang.value)
}

function kindLabel(kind: string): string {
  if (kind === 'boss') return t('pbz.codex.kindBoss')
  if (kind === 'normal') return t('pbz.codex.kindNormal')
  if (kind === 'book') return t('pbz.codex.kindBook')
  if (kind === 'page') return t('pbz.codex.kindPage')
  if (kind === 'flower') return t('pbz.codex.kindFlower')
  if (kind === 'petal') return t('pbz.codex.kindPetal')
  return kind
}

function toggleDiscovered(id: string, on: boolean): void {
  editor.markDirty(() => setCodexDiscovered(editor.save.model, id, on))
}

function toggleRevealed(id: string, on: boolean): void {
  editor.markDirty(() => setCodexRevealed(editor.save.model, id, on))
}

function toggleOwned(id: string, on: boolean): void {
  editor.markDirty(() => {
    if (category.value === 'books') {
      setCodexBookOwned(editor.save.model, selectedSlotName.value, id, on)
    } else {
      setCodexMemoryOwned(editor.save.model, selectedSlotName.value, id, on)
    }
  })
}

async function confirmDanger(messageKey: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(t(messageKey), t('pbz.codex.confirmTitle'), {
      type: 'warning',
      confirmButtonText: t('pbz.codex.confirm'),
      cancelButtonText: t('pbz.codex.cancel')
    })
    return true
  } catch {
    return false
  }
}

async function onUnlockAll(): Promise<void> {
  if (category.value === 'enemies') {
    if (!(await confirmDanger('pbz.codex.unlockAllConfirm'))) return
    editor.markDirty(() => unlockAllCodex(editor.save.model))
    ElMessage.success(t('pbz.codex.unlockedAll'))
    return
  }
  if (category.value === 'books') {
    if (!(await confirmDanger('pbz.codex.unlockAllBooksConfirm'))) return
    editor.markDirty(() => unlockAllCodexBooks(editor.save.model, selectedSlotName.value))
    ElMessage.success(t('pbz.codex.unlockedAllBooks'))
    return
  }
  if (!(await confirmDanger('pbz.codex.unlockAllMemoriesConfirm'))) return
  editor.markDirty(() => unlockAllCodexMemories(editor.save.model, selectedSlotName.value))
  ElMessage.success(t('pbz.codex.unlockedAllMemories'))
}

async function onUnlockDiscovered(): Promise<void> {
  if (!(await confirmDanger('pbz.codex.unlockDiscoveredConfirm'))) return
  editor.markDirty(() => unlockAllCodexDiscovered(editor.save.model))
  ElMessage.success(t('pbz.codex.unlockedDiscovered'))
}

async function onUnlockRevealed(): Promise<void> {
  if (!(await confirmDanger('pbz.codex.unlockRevealedConfirm'))) return
  editor.markDirty(() => unlockAllCodexRevealed(editor.save.model))
  ElMessage.success(t('pbz.codex.unlockedRevealed'))
}

async function onClearDiscovered(): Promise<void> {
  if (!(await confirmDanger('pbz.codex.clearDiscoveredConfirm'))) return
  editor.markDirty(() => clearCodexDiscovered(editor.save.model))
  ElMessage.success(t('pbz.codex.clearedDiscovered'))
}

async function onClearRevealed(): Promise<void> {
  if (!(await confirmDanger('pbz.codex.clearRevealedConfirm'))) return
  editor.markDirty(() => clearCodexRevealed(editor.save.model))
  ElMessage.success(t('pbz.codex.clearedRevealed'))
}

async function onClearOwned(): Promise<void> {
  if (category.value === 'books') {
    if (!(await confirmDanger('pbz.codex.clearBooksConfirm'))) return
    editor.markDirty(() => clearAllCodexBooks(editor.save.model, selectedSlotName.value))
    ElMessage.success(t('pbz.codex.clearedBooks'))
    return
  }
  if (!(await confirmDanger('pbz.codex.clearMemoriesConfirm'))) return
  editor.markDirty(() => clearAllCodexMemories(editor.save.model, selectedSlotName.value))
  ElMessage.success(t('pbz.codex.clearedMemories'))
}
</script>

<template>
  <section class="pbz-codex" :data-ss-rev="editor.rev">
    <el-alert
      class="pbz-codex__risk"
      type="warning"
      :closable="false"
      show-icon
      :title="t('pbz.codex.risk')"
    />

    <el-radio-group v-model="category" class="pbz-codex__cats">
      <el-radio-button value="enemies">{{ t('pbz.codex.catEnemies') }}</el-radio-button>
      <el-radio-button value="books">{{ t('pbz.codex.catBooks') }}</el-radio-button>
      <el-radio-button value="memories">{{ t('pbz.codex.catMemories') }}</el-radio-button>
    </el-radio-group>

    <el-alert
      v-if="category === 'memories'"
      class="pbz-codex__memhint"
      type="info"
      :closable="false"
      show-icon
      :title="t('pbz.codex.memoryHint')"
    />
    <el-alert
      v-else-if="category === 'books'"
      class="pbz-codex__memhint"
      type="info"
      :closable="false"
      show-icon
      :title="t('pbz.codex.bookHint')"
    />

    <el-form v-if="category !== 'enemies'" label-width="120px" class="pbz-codex__slot">
      <el-form-item :label="t('pbz.codex.slot')">
        <el-select :model-value="selectedSlotName" @update:model-value="changeSlot">
          <el-option
            v-for="slot in editableSlots"
            :key="slot.name"
            :label="slot.name"
            :value="slot.name"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <el-empty
      v-if="category === 'enemies' && !enemyView"
      :description="t('pbz.codex.unavailable')"
    />
    <el-empty
      v-else-if="category !== 'enemies' && !selectedSlot"
      :description="t('pbz.codex.noSlot')"
    />

    <!-- Enemies: flat table -->
    <template v-else-if="category === 'enemies' && enemyView">
      <div class="pbz-codex__summary">
        <span>{{ t('pbz.codex.discoveredProgress', enemyView.discoveredCount, enemyView.total) }}</span>
        <span>{{ t('pbz.codex.revealedProgress', enemyView.revealedCount, enemyView.total) }}</span>
      </div>

      <div class="pbz-codex__toolbar">
        <el-input v-model="filter" clearable :placeholder="t('pbz.codex.filterPlaceholder')" />
        <el-select v-model="mapFilter" style="width: 180px">
          <el-option :label="t('pbz.codex.mapAll')" value="all" />
          <el-option
            v-for="map in mapOptions"
            :key="map.id"
            :label="mapDisplayName(map.id)"
            :value="map.id"
          />
        </el-select>
        <el-select v-model="statusFilter" style="width: 160px">
          <el-option :label="t('pbz.codex.filterAll')" value="all" />
          <el-option :label="t('pbz.codex.filterMissing')" value="missing" />
          <el-option :label="t('pbz.codex.filterDiscoveredOnly')" value="discovered-only" />
          <el-option :label="t('pbz.codex.filterComplete')" value="complete" />
        </el-select>
        <el-select v-model="kindFilter" style="width: 130px">
          <el-option :label="t('pbz.codex.kindAll')" value="all" />
          <el-option :label="t('pbz.codex.kindBoss')" value="boss" />
          <el-option :label="t('pbz.codex.kindNormal')" value="normal" />
        </el-select>
      </div>

      <div class="pbz-codex__actions">
        <el-button type="primary" @click="onUnlockAll">{{ t('pbz.codex.unlockAll') }}</el-button>
        <el-button @click="onUnlockDiscovered">{{ t('pbz.codex.unlockDiscovered') }}</el-button>
        <el-button @click="onUnlockRevealed">{{ t('pbz.codex.unlockRevealed') }}</el-button>
        <el-button type="danger" plain @click="onClearDiscovered">
          {{ t('pbz.codex.clearDiscovered') }}
        </el-button>
        <el-button type="danger" plain @click="onClearRevealed">
          {{ t('pbz.codex.clearRevealed') }}
        </el-button>
      </div>

      <el-empty v-if="enemyRows.length === 0" :description="t('pbz.codex.empty')" />
      <el-table v-else :data="enemyRows" row-key="id" height="520">
        <el-table-column :label="t('pbz.codex.name')" min-width="180">
          <template #default="{ row }">{{ enemyDisplayName(String(row.id)) }}</template>
        </el-table-column>
        <el-table-column prop="id" :label="t('pbz.codex.id')" min-width="200" />
        <el-table-column :label="t('pbz.codex.kind')" width="90">
          <template #default="{ row }">
            {{ row.isBoss ? t('pbz.codex.kindBoss') : t('pbz.codex.kindNormal') }}
          </template>
        </el-table-column>
        <el-table-column :label="t('pbz.codex.map')" min-width="140">
          <template #default="{ row }">{{ mapDisplayName(String(row.ownMapId ?? '')) }}</template>
        </el-table-column>
        <el-table-column :label="t('pbz.codex.discovered')" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.discovered"
              @update:model-value="(v) => toggleDiscovered(String(row.id), Boolean(v))"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('pbz.codex.revealed')" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.revealed"
              @update:model-value="(v) => toggleRevealed(String(row.id), Boolean(v))"
            />
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- Books / Memories: hierarchical tree -->
    <template v-else-if="litView">
      <div class="pbz-codex__summary">
        <span>{{ t('pbz.codex.ownedProgress', litView.ownedCount, litView.total) }}</span>
      </div>

      <div class="pbz-codex__toolbar pbz-codex__toolbar--lit">
        <el-input v-model="filter" clearable :placeholder="t('pbz.codex.filterPlaceholder')" />
        <el-select v-model="mapFilter" style="width: 180px">
          <el-option :label="t('pbz.codex.mapAll')" value="all" />
          <el-option
            v-for="map in mapOptions"
            :key="map.id"
            :label="mapDisplayName(map.id)"
            :value="map.id"
          />
        </el-select>
        <el-select v-model="statusFilter" style="width: 160px">
          <el-option :label="t('pbz.codex.filterAll')" value="all" />
          <el-option :label="t('pbz.codex.filterOwned')" value="owned" />
          <el-option :label="t('pbz.codex.filterUnowned')" value="unowned" />
        </el-select>
      </div>

      <div class="pbz-codex__actions">
        <el-button type="primary" @click="onUnlockAll">
          {{ category === 'books' ? t('pbz.codex.unlockAllBooks') : t('pbz.codex.unlockAllMemories') }}
        </el-button>
        <el-button type="danger" plain @click="onClearOwned">
          {{ category === 'books' ? t('pbz.codex.clearBooks') : t('pbz.codex.clearMemories') }}
        </el-button>
      </div>

      <el-empty v-if="litTree.length === 0" :description="t('pbz.codex.empty')" />
      <el-table
        v-else
        :key="treeKey"
        :data="litTree"
        row-key="id"
        height="520"
        :tree-props="{ children: 'children' }"
        :default-expand-all="isFiltering"
      >
        <el-table-column :label="t('pbz.codex.name')" min-width="240">
          <template #default="{ row }">
            <span>{{ litDisplayName(String(row.id)) }}</span>
            <el-tag
              v-if="childStats(String(row.id))"
              class="pbz-codex__sub"
              size="small"
              type="info"
              effect="plain"
            >
              {{
                category === 'books'
                  ? t('pbz.codex.pageProgress', childStats(String(row.id))!.owned, childStats(String(row.id))!.total)
                  : t('pbz.codex.petalProgress', childStats(String(row.id))!.owned, childStats(String(row.id))!.total)
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="id" :label="t('pbz.codex.id')" min-width="150" />
        <el-table-column :label="t('pbz.codex.kind')" width="110">
          <template #default="{ row }">{{ kindLabel(String(row.kind)) }}</template>
        </el-table-column>
        <el-table-column :label="t('pbz.codex.map')" min-width="140">
          <template #default="{ row }">{{ mapDisplayName(String(row.ownMapId ?? '')) }}</template>
        </el-table-column>
        <el-table-column :label="t('pbz.codex.owned')" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.owned"
              @update:model-value="(v) => toggleOwned(String(row.id), Boolean(v))"
            />
          </template>
        </el-table-column>
      </el-table>
    </template>
  </section>
</template>

<style scoped>
.pbz-codex {
  display: grid;
  gap: 12px;
}

.pbz-codex__risk {
  white-space: normal;
}

.pbz-codex__memhint {
  white-space: normal;
}

.pbz-codex__cats {
  justify-self: start;
}

.pbz-codex__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: var(--el-text-color-regular);
}

.pbz-codex__sub {
  margin-left: 8px;
}

.pbz-codex__toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 180px 160px 130px;
  gap: 12px;
}

.pbz-codex__toolbar--lit {
  grid-template-columns: minmax(160px, 1fr) 180px 160px;
}

.pbz-codex__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 900px) {
  .pbz-codex__toolbar,
  .pbz-codex__toolbar--lit {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
