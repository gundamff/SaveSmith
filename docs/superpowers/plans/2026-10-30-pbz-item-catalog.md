# Phantom Blade Zero Item Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw PBZ inventory IDs with official Chinese/English names and safely support editing or adding weapon-upgrade materials and ordinary consumables.

**Architecture:** Development-only extraction scripts normalize FModel exports from Steam build `26266538` into a small checked-in catalog; runtime code never opens game PAK files. A catalog service owns localization, classification, limits, and search, while the save model remains the only code allowed to project or mutate `InventoryInfos`. The Vue page consumes those two APIs through separate material and consumable tabs.

**Tech Stack:** TypeScript 6, Vue 3, Element Plus, Vitest 3, existing PBZS parser, FModel/CUE4Parse export artifacts used only during catalog generation.

## Global Constraints

- Source build is Steam `26266538`; record the exported input hashes and catalog generator command.
- Do not commit game PAK/UTOC/UCAS, raw exported assets, USMAP, AES keys, player saves, executable tools, or temporary reports.
- Runtime must not read the installed game, use Node/Tauri filesystem APIs, or include an IoStore parser.
- Supported categories are exactly `weapon-material` and `consumable`.
- Exclude threshold collectibles such as 记忆之花、黑石碎片 and 杀气琥珀, plus weapons, accessories, quests, keys, story items, DLC, and unlock state.
- Chinese names fall back to English; English names fall back to Chinese; an absent name renders as an explicit unknown label plus raw ID.
- `Player.Dust` remains the storage field and is displayed as `意识尘埃` in Chinese.
- New records are allowed only after the real-save audit proves the complete category schema; no arbitrary sibling cloning.
- Material amounts remain `0..9999`; the current build's only supported consumable is `Item_Traversing`, limited by SaveSmith to `0..99` because the resources provide no official stack limit.
- Existing unknown JSON fields and every unmodified sealed slot remain preserved.

---

### Task 1: Extract, audit, and generate the item catalog

**Files:**
- Create: `scripts/pbz-discover-item-assets.mts`
- Create: `scripts/pbz-build-item-catalog.mts`
- Create: `src/games/phantom-blade-zero/catalog/items.json`
- Create: `src/games/phantom-blade-zero/catalog/SOURCE.md`
- Create: `tests/phantom-blade-zero/catalog-source.spec.ts`

**Interfaces:**
- Consumes: FModel JSON/text exports under `PBZ_EXPORT_DIR`; optional real save path from `PBZ_SAVE`.
- Produces: `items.json` rows matching the exact schema `{ id, category, zh, en, maxAmount }`.

- [ ] **Step 1: Export and inventory matching game resources**

Configure FModel against `F:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Content\Paks`, select the local build-matched USMAP, enter the resource key through FModel's AES dialog, and export DataTables/string tables plus `zh-Hans` and `en` localization into `%TEMP%\pbz-item-export`. Keep the key and USMAP outside the repository.

Create a read-only discovery script that recursively scans exported UTF-8 JSON/text for inventory IDs and writes only a temporary report:

```ts
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.env.PBZ_EXPORT_DIR
if (!root) throw new Error('PBZ_EXPORT_DIR is required')
const hits: Array<{ file: string; ids: string[] }> = []
const idPattern = /\b(?:Weapon_Material|Item|Consumable)_[A-Za-z0-9_]+\b/g

function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(json|txt|csv)$/i.test(name)) {
      const ids = [...new Set(readFileSync(path, 'utf8').match(idPattern) ?? [])]
      if (ids.length) hits.push({ file: path, ids })
    }
  }
}

walk(root)
writeFileSync(join(root, 'pbz-item-assets-report.json'), JSON.stringify(hits, null, 2))
if (!hits.length) throw new Error('No PBZ inventory IDs found in exports')
```

- [ ] **Step 2: Audit real-save record shapes before permitting creation**

Extend the discovery script to parse `PBZ_SAVE` in memory through the existing PBZ module and emit a temporary shape report containing category, sorted field names, value types, and sample-free counts. It must not emit IDs, names, values, timestamps, or save bytes.

Required assertion before continuing:

```ts
const REQUIRED_FIELDS = [
  'AcquiredCycle',
  'CurrentAmount',
  'DirtyTime',
  'FirstAddTime',
  'MaxAmount'
]

if (!auditedShapes.every((shape) =>
  REQUIRED_FIELDS.every((field) => shape.fields.includes(field))
)) {
  throw new Error('PBZ inventory record schema is not safe for creation')
}
```

If ordinary consumables have additional required fields or category-specific side effects, stop this task and remove those entries from the addable catalog rather than inventing defaults. For build `26266538`, the audited consumable whitelist is exactly `Item_Traversing`; its `maxAmount` is the SaveSmith safety limit `99`, not an official resource value.

- [ ] **Step 3: Write the failing catalog-source test**

```ts
import items from '../../src/games/phantom-blade-zero/catalog/items.json'

it('ships only complete supported PBZ catalog rows', () => {
  expect(items.length).toBeGreaterThan(0)
  expect(new Set(items.map(({ id }) => id)).size).toBe(items.length)
  for (const row of items) {
    expect(row.id).toMatch(/^[A-Za-z0-9_]+$/)
    expect(['weapon-material', 'consumable']).toContain(row.category)
    expect(row.zh || row.en).toBeTruthy()
    expect(Number.isSafeInteger(row.maxAmount)).toBe(true)
    expect(row.maxAmount).toBeGreaterThan(0)
  }
})

it('does not expose known threshold collectibles', () => {
  const text = JSON.stringify(items)
  expect(text).not.toMatch(/记忆之花|黑石碎片|杀气琥珀/)
})
```

- [ ] **Step 4: Run the test and verify RED**

Run: `npx vitest run tests/phantom-blade-zero/catalog-source.spec.ts`

Expected: FAIL because `catalog/items.json` does not exist.

- [ ] **Step 5: Implement deterministic catalog generation**

The generator must accept normalized exported rows and localization maps, reject duplicate/conflicting IDs, reject unsupported categories, sort by ID, and write only the five approved fields:

```ts
type Category = 'weapon-material' | 'consumable'
type ItemRow = {
  id: string
  category: Category
  zh: string
  en: string
  maxAmount: number
}

function accept(row: ItemRow): boolean {
  if (row.category === 'weapon-material') return row.id.startsWith('Weapon_Material_')
  return row.category === 'consumable' && row.maxAmount > 0
}

const output = rows
  .filter(accept)
  .filter((row) => !thresholdCollectibleIds.has(row.id))
  .sort((a, b) => a.id.localeCompare(b.id))
```

Run:

```powershell
$env:PBZ_EXPORT_DIR="$env:TEMP\pbz-item-export"
node --experimental-strip-types scripts/pbz-build-item-catalog.mts
```

Expected: prints material/consumable counts and writes stable `items.json`; a second run leaves `git diff` unchanged.

- [ ] **Step 6: Document provenance without sensitive inputs**

`SOURCE.md` must record build `26266538`, export date, source asset paths, SHA-256 of each normalized input, generator command, row counts, exclusions, and the real-save shape-audit result. It must state that AES keys, USMAP, raw exports, and saves are not redistributed.

- [ ] **Step 7: Run tests and commit**

Run: `npx vitest run tests/phantom-blade-zero/catalog-source.spec.ts`

Expected: PASS.

```bash
git add scripts/pbz-discover-item-assets.mts scripts/pbz-build-item-catalog.mts src/games/phantom-blade-zero/catalog tests/phantom-blade-zero/catalog-source.spec.ts
git commit -m "data(pbz): derive official item catalog"
```

---

### Task 2: Add localized catalog lookup and search

**Files:**
- Create: `src/games/phantom-blade-zero/catalog/index.ts`
- Create: `tests/phantom-blade-zero/catalog.spec.ts`

**Interfaces:**
- Consumes: generated `items.json`; host `locale`.
- Produces: `PbzCatalogItem`, `pbzCatalog`, `getPbzItem(id)`, `pbzItemName(item, locale?)`, and `searchPbzItems(category, query)`.

- [ ] **Step 1: Write failing lookup/search tests**

```ts
expect(pbzCatalog.every((row) =>
  row.category === 'weapon-material' || row.category === 'consumable'
)).toBe(true)
expect(pbzItemName({ ...sample, zh: '', en: 'Official English' }, 'zh'))
  .toBe('Official English')
expect(searchPbzItems('weapon-material', sample.zh.slice(0, 2)))
  .toContainEqual(sample)
expect(searchPbzItems(sample.category, sample.id.toLowerCase()))
  .toContainEqual(sample)
expect(searchPbzItems('consumable', '记忆之花')).toEqual([])
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run tests/phantom-blade-zero/catalog.spec.ts`

Expected: FAIL because `catalog/index.ts` is missing.

- [ ] **Step 3: Implement immutable catalog APIs**

```ts
export type PbzItemCategory = 'weapon-material' | 'consumable'
export interface PbzCatalogItem {
  readonly id: string
  readonly category: PbzItemCategory
  readonly zh: string
  readonly en: string
  readonly maxAmount: number
}

export function pbzItemName(
  item: PbzCatalogItem,
  language: 'zh' | 'en' = locale.value
): string {
  return language === 'zh'
    ? item.zh || item.en || `${t('pbz.resources.unknownItem')} (${item.id})`
    : item.en || item.zh || `${t('pbz.resources.unknownItem')} (${item.id})`
}

export function searchPbzItems(category: PbzItemCategory, query: string): PbzCatalogItem[] {
  const needle = query.trim().toLocaleLowerCase()
  return pbzCatalog.filter((row) =>
    row.category === category &&
    (!needle || [row.id, row.zh, row.en].some((value) =>
      value.toLocaleLowerCase().includes(needle)
    ))
  )
}
```

- [ ] **Step 4: Run tests, typecheck, and commit**

Run:

```bash
npx vitest run tests/phantom-blade-zero/catalog.spec.ts tests/phantom-blade-zero/catalog-source.spec.ts
npm run typecheck
```

Expected: all selected tests PASS; typecheck exits `0`.

```bash
git add src/games/phantom-blade-zero/catalog tests/phantom-blade-zero/catalog.spec.ts
git commit -m "feat(pbz): add localized item catalog lookup"
```

---

### Task 3: Generalize inventory projection and add safe upsert

**Files:**
- Create: `src/games/phantom-blade-zero/model/inventoryRecord.ts`
- Modify: `src/games/phantom-blade-zero/model/saveModel.ts`
- Modify: `tests/phantom-blade-zero/saveModel.spec.ts`

**Interfaces:**
- Consumes: `getPbzItem(id)` and catalog limits from Task 2.
- Produces: `PbzInventoryItemView`, `projectInventory(slot, category)`, `setInventoryAmount(model, slotName, id, amount)`, and `addInventoryItem(model, slotName, id, amount, now?)`.

- [ ] **Step 1: Write failing tests for projection and existing edits**

Cover catalog-known materials and consumables, exclude unknown/collectible IDs, preserve existing unknown fields, enforce category-specific limits, and keep no-op edits clean:

```ts
expect(projectInventory(editable, 'consumable')).toEqual([
  { id: consumable.id, category: 'consumable', currentAmount: 2, maxAmount: consumable.maxAmount }
])
expect(() => setInventoryAmount(model, editable.name, consumable.id, consumable.maxAmount + 1))
  .toThrow()
```

- [ ] **Step 2: Write failing tests for new records**

```ts
addInventoryItem(model, editable.name, material.id, 3, new Date('2026-10-30T10:20:30Z'))
expect(infos[material.id]).toEqual({
  CurrentAmount: 3,
  MaxAmount: 3,
  FirstAddTime: '2026.10.30-18.20.30',
  DirtyTime: '2026.10.30-18.20.30',
  AcquiredCycle: 0
})
expect(editable.dirty).toBe(true)

addInventoryItem(model, editable.name, material.id, 2, sameDate)
expect((infos[material.id] as Record<string, number>).CurrentAmount).toBe(5)
expect(Object.keys(infos).filter((id) => id === material.id)).toHaveLength(1)
```

Also test missing `Inventory`/`InventoryInfos`, unknown IDs, unsupported categories, malformed existing records, overflow, and preservation after serialize/reparse.

- [ ] **Step 3: Run and verify RED**

Run: `npx vitest run tests/phantom-blade-zero/saveModel.spec.ts`

Expected: FAIL because the generalized projection and add APIs do not exist.

- [ ] **Step 4: Implement canonical record construction**

Keep timestamp and record construction isolated:

```ts
export function formatPbzTime(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value
  return `${value('year')}.${value('month')}.${value('day')}-${value('hour')}.${value('minute')}.${value('second')}`
}

export function createInventoryRecord(
  item: PbzCatalogItem,
  amount: number,
  now: Date,
  acquiredCycle: number
): Record<string, unknown> {
  const stamp = formatPbzTime(now)
  return {
    CurrentAmount: amount,
    MaxAmount: item.category === 'weapon-material' ? amount : item.maxAmount,
    FirstAddTime: stamp,
    DirtyTime: stamp,
    AcquiredCycle: acquiredCycle
  }
}
```

The final field set and time zone must match Task 1's audited real-save evidence exactly. Derive `AcquiredCycle` from the verified slot field when present; use `0` only if Task 1 proves new records use zero for the current build.

- [ ] **Step 5: Implement catalog-gated mutation**

```ts
export function addInventoryItem(
  model: PbzSaveModel,
  slotName: string,
  id: string,
  amount: number,
  now = new Date()
): void {
  const item = requireCatalogItem(id)
  requireAmount(item, amount)
  const slot = requireSlot(model, slotName)
  const infos = requireInventoryInfos(slot)
  const existing = readProjectedInventoryItem(infos, item)
  if (existing) {
    setExistingAmount(slot, item, existing, existing.currentAmount + amount, now)
    return
  }
  infos[id] = createInventoryRecord(item, amount, now, readAcquiredCycle(slot))
  slot.dirty = true
}
```

Update `validateDocument` so catalog-known supported records are validated by category while unrelated records remain untouched.

- [ ] **Step 6: Run focused and regression tests**

Run:

```bash
npx vitest run tests/phantom-blade-zero/saveModel.spec.ts tests/phantom-blade-zero/module.spec.ts tests/phantom-blade-zero/e2e-real-save.spec.ts
npm run typecheck
```

Expected: focused tests PASS; real-save suite is skipped unless `PBZ_SAVE` is set; typecheck exits `0`.

- [ ] **Step 7: Commit**

```bash
git add src/games/phantom-blade-zero/model tests/phantom-blade-zero/saveModel.spec.ts
git commit -m "feat(pbz): safely add catalog inventory items"
```

---

### Task 4: Build the two-tab item UI and bilingual copy

**Files:**
- Create: `src/games/phantom-blade-zero/views/InventoryCategoryTab.vue`
- Create: `src/games/phantom-blade-zero/views/AddItemDialog.vue`
- Modify: `src/games/phantom-blade-zero/views/ResourcesTab.vue`
- Modify: `src/host/i18n/zh.ts`
- Modify: `src/host/i18n/en.ts`
- Modify: `tests/phantom-blade-zero/views.spec.ts`
- Modify: `tests/i18n.spec.ts`

**Interfaces:**
- Consumes: catalog search/name APIs and model projection/mutation APIs.
- Produces: material and consumable tabs with searchable existing rows and an add dialog.

- [ ] **Step 1: Write failing structural UI and i18n tests**

Assert:

```ts
expect(resourcesSource).toMatch(/InventoryCategoryTab/)
expect(resourcesSource).toMatch(/weapon-material/)
expect(resourcesSource).toMatch(/consumable/)
expect(dialogSource).toMatch(/searchPbzItems/)
expect(dialogSource).toMatch(/addInventoryItem/)
expect(zh.pbz.resources.dust).toBe('意识尘埃')
expect(en.pbz.resources.dust).not.toBe('Dust field')
```

Also assert no direct `document` mutation and no filesystem/Tauri import in either component.

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run tests/phantom-blade-zero/views.spec.ts tests/i18n.spec.ts`

Expected: FAIL because the two components and new keys are missing.

- [ ] **Step 3: Implement reusable category table**

`InventoryCategoryTab.vue` receives:

```ts
const props = defineProps<{
  category: PbzItemCategory
  slot: PbzEditableSlot
}>()
```

It projects rows through `projectInventory`, resolves names through `pbzItemName`, filters by Chinese name, English name, or ID, and invokes mutators only inside `editor.markDirty`.

- [ ] **Step 4: Implement searchable add dialog**

Use a filterable `el-select` backed only by `searchPbzItems(props.category, query)`, an `el-input-number` with dynamic `maxAmount`, and explicit cancel/confirm buttons. Existing IDs remain selectable and confirmation adds to the existing quantity.

```ts
function confirmAdd(): void {
  if (!selectedId.value || !Number.isSafeInteger(amount.value)) return
  editor.markDirty(() =>
    addInventoryItem(editor.save.model, props.slotName, selectedId.value!, amount.value)
  )
  open.value = false
}
```

- [ ] **Step 5: Integrate tabs and official currency name**

Keep slot selection and dirty-switch reconciliation in `ResourcesTab.vue`; replace the single material section with:

```vue
<el-tabs v-if="selectedSlot" v-model="activeCategory">
  <el-tab-pane :label="t('pbz.resources.weaponMaterials')" name="weapon-material">
    <InventoryCategoryTab category="weapon-material" :slot="selectedSlot" />
  </el-tab-pane>
  <el-tab-pane :label="t('pbz.resources.consumables')" name="consumable">
    <InventoryCategoryTab category="consumable" :slot="selectedSlot" />
  </el-tab-pane>
</el-tabs>
```

Set Chinese `pbz.resources.dust` to `意识尘埃`; use the official extracted English localization in `en.ts`.

- [ ] **Step 6: Run UI, i18n, full tests, and typecheck**

Run:

```bash
npx vitest run tests/phantom-blade-zero/views.spec.ts tests/i18n.spec.ts
npm test
npm run typecheck
```

Expected: all tests PASS except intentional existing skips; typecheck exits `0`.

- [ ] **Step 7: Commit**

```bash
git add src/games/phantom-blade-zero/views src/host/i18n tests/phantom-blade-zero/views.spec.ts tests/i18n.spec.ts
git commit -m "feat(pbz): add named material and consumable tabs"
```

---

### Task 5: Real-save regression, documentation, and in-game acceptance

**Files:**
- Modify: `tests/phantom-blade-zero/e2e-real-save.spec.ts`
- Modify: `docs/games/phantom-blade-zero.md`
- Modify: `docs/games/phantom-blade-zero.en.md`
- Modify: `docs/HANDTEST.md`
- Modify: `CHANGELOG.md`
- Modify: `CHANGELOG.en.md`

**Interfaces:**
- Consumes: complete catalog/model/UI behavior.
- Produces: read-only automated real-save evidence and explicit manual release gate.

- [ ] **Step 1: Add gated in-memory add regressions**

Choose one absent material and one absent verified consumable from the catalog, add each to a parsed state in memory, serialize/reparse, and assert the new canonical record while preserving every other sealed slot block. Never write `PBZ_SAVE`.

```ts
const absent = pbzCatalog.find((item) =>
  item.category === category && !resources.some(({ id }) => id === item.id)
)
if (!absent) context.skip(`no absent ${category} in this save`)
addInventoryItem(state.model, slot.name, absent.id, 1, fixedDate)
```

- [ ] **Step 2: Run the real-save suite and verify source immutability**

```powershell
$save = 'F:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\PBZSaveGame.sav'
$before = (Get-FileHash -Algorithm SHA256 $save).Hash
$env:PBZ_SAVE = $save
npx vitest run tests/phantom-blade-zero
$after = (Get-FileHash -Algorithm SHA256 $save).Hash
if ($before -ne $after) { throw 'PBZ_SAVE changed during tests' }
```

Expected: PBZ tests PASS and hashes match.

- [ ] **Step 3: Update user and hand-test documentation**

Document official names, the two categories, add-vs-increase behavior, category limits, exclusions, and backup requirement. HANDTEST must require separate backup-copy checks for a previously absent material and a previously absent consumable.

- [ ] **Step 4: Run final automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: tests PASS with only intentional skips, typecheck/build exit `0`, and diff check is empty.

- [ ] **Step 5: Commit implementation and documentation**

```bash
git add tests/phantom-blade-zero/e2e-real-save.spec.ts docs/games docs/HANDTEST.md CHANGELOG.md CHANGELOG.en.md
git commit -m "docs(pbz): verify named inventory additions"
```

- [ ] **Step 6: Perform the destructive acceptance only after user approval**

Back up the entire save directory. On the approved copy:

1. Add one previously absent weapon-upgrade material with quantity `1`.
2. Confirm the game loads it and can consume it in weapon upgrading.
3. Save, exit, and reload.
4. Add one previously absent ordinary consumable with quantity `1`.
5. Confirm it appears and can be consumed.
6. Save, exit, reload, and parse the game-rewritten save in SaveSmith.

If either category fails, remove “add absent item” for that category before release; do not weaken validation.

- [ ] **Step 7: Request final code review**

Review the complete branch against `docs/superpowers/specs/2026-10-30-pbz-item-catalog-design.md`, fix verified findings, rerun Task 5 Step 4, and only then enter the branch-finishing/release flow.
