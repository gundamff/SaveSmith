# PBZ Boss Difficulty Re-key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players re-hang an existing BOSS Records entry onto another difficulty key via a Records-tab dropdown, using a full whitelist unpacked from the current game build, with localized friendly errors.

**Architecture:** Static `catalog/bossDifficulties.json` + lookup helpers; `setBossDifficultyKey` moves `BossRecord.*.Records[from] → Records[to]` as a whole object; RecordsTab difficulty column becomes `el-select`; errors use dedicated `ModuleError` codes registered in zh/en. No runtime game-install reads.

**Tech Stack:** TypeScript, Vue 3, Element Plus, Vitest, existing PBZ catalog / bossRecords patterns, RE playbook CUE4Parse/FModel for one-time catalog generation.

**Spec:** [2026-11-09-phantom-blade-zero-boss-difficulty-design.md](./2026-11-09-phantom-blade-zero-boss-difficulty-design.md)

## Global Constraints

- Module id `phantom-blade-zero`; no `fs` / Tauri inside the game module.
- Scope: **re-key existing** Records rows only — never fabricate new BOSS or new clear rows.
- Target key already present for same boss → refuse (no merge / overwrite).
- Whitelist only enforced on **write**; unknown keys already in a save still project and allow death/time edits.
- User-visible failures must go through `translateError` with zh/en templates; never leave players with bare `PBZ_INVALID_EDIT` for these cases.
- Locked error codes (args = display strings where possible):
  - `PBZ_BOSS_DIFFICULTY_UNKNOWN` — `[toDisplay]`
  - `PBZ_BOSS_DIFFICULTY_MISSING` — `[bossId, fromDisplay]`
  - `PBZ_BOSS_DIFFICULTY_CONFLICT` — `[bossId, fromDisplay, toDisplay]`
- Do not commit player saves, unpacked pak dumps, USMAP, or temp tool binaries.

## File map

| File | Role |
|------|------|
| `catalog/bossDifficulties.json` | Static whitelist rows |
| `catalog/bossDifficulties.ts` | Types, `getPbzBossDifficulty`, `listPbzBossDifficulties`, `pbzBossDifficultyName` |
| `catalog/SOURCE.md` | Provenance paragraph for difficulties |
| `scripts/pbz-build-boss-difficulties.mts` (optional) | Rebuild JSON from local DT/enum export |
| `model/bossRecords.ts` | `setBossDifficultyKey` |
| `model/saveModel.ts` | Re-export |
| `views/RecordsTab.vue` | Difficulty `el-select` + risk alert + localized catch |
| `host/i18n/zh.ts` + `en.ts` | UI copy + three error templates |
| `docs/games/phantom-blade-zero.md` + `.en.md`, `docs/HANDTEST.md`, `CHANGELOG*.md` | Docs |
| `tests/phantom-blade-zero/boss-difficulties-catalog.spec.ts` | Catalog |
| `tests/phantom-blade-zero/saveModel.spec.ts` (extend) | Re-key / errors |
| `tests/phantom-blade-zero/views.spec.ts` (extend) | Risk string / select wiring smoke |
| `tests/host/i18n-pbz-boss-difficulty.spec.ts` (or extend existing i18n test) | `translateError` ≠ bare code |

---

### Task 1: Unpack current build → `bossDifficulties.json` + catalog module

**Files:**
- Create: `src/games/phantom-blade-zero/catalog/bossDifficulties.json`
- Create: `src/games/phantom-blade-zero/catalog/bossDifficulties.ts`
- Modify: `src/games/phantom-blade-zero/catalog/SOURCE.md`
- Create (optional): `scripts/pbz-build-boss-difficulties.mts`
- Test: `tests/phantom-blade-zero/boss-difficulties-catalog.spec.ts`

**Interfaces:**
- Produces:
  - `export interface PbzBossDifficulty { readonly key: string; readonly zh: string; readonly en: string; readonly order: number }`
  - `export const pbzBossDifficulties: readonly PbzBossDifficulty[]`
  - `export function getPbzBossDifficulty(key: string): PbzBossDifficulty | undefined`
  - `export function listPbzBossDifficulties(): readonly PbzBossDifficulty[]` — sorted by `order` then `key`
  - `export function pbzBossDifficultyName(key: string, language?: 'zh' | 'en'): string` — catalog name, else raw `key`

**Evidence target:** Live saves already use keys like `0_2`, `0_3`. Unpack must discover the **full** legal key set (and display names) for the installed Steam build (prefer current `F:\SteamLibrary\steamapps\common\PBZ`, record actual `buildid` from `appmanifest_4115450.acf`). Follow [RE playbook §6](./2026-10-30-phantom-blade-zero-re-playbook.md). Search candidates: difficulty enums, GameMode/Difficulty DataTables, localization keys for 入阵者/破局者/逆天者/六十六天 etc. Document exact asset paths and key encoding in SOURCE.md.

- [ ] **Step 1: Write failing catalog test**

```ts
import { describe, expect, it } from 'vitest'
import {
  getPbzBossDifficulty,
  listPbzBossDifficulties,
  pbzBossDifficultyName,
} from '@games/phantom-blade-zero/catalog/bossDifficulties'

describe('PBZ boss difficulties catalog', () => {
  it('loads at least the keys seen in live saves and sorts by order', () => {
    const list = listPbzBossDifficulties()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(getPbzBossDifficulty('0_2')).toBeTruthy()
    expect(getPbzBossDifficulty('0_3')).toBeTruthy()
    const orders = list.map((row) => row.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('names unknown keys as the raw key', () => {
    expect(pbzBossDifficultyName('nope_99', 'zh')).toBe('nope_99')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL** (module / JSON missing)

```powershell
npx vitest run tests/phantom-blade-zero/boss-difficulties-catalog.spec.ts
```

- [ ] **Step 3: Unpack + generate JSON**

1. Note Steam `buildid`.
2. Export difficulty-related tables/enums via CUE4Parse or FModel (playbook §6).
3. Produce `bossDifficulties.json` as an array of `{ "key", "zh", "en", "order" }` covering **every** legal Records key the game can write.
4. Must include at least `0_2` and `0_3` if still used by this build.
5. Append SOURCE.md section: build id, asset paths, generation command, row count.
6. If key encoding is `{cycleOrBucket}_{difficultyEnum}`, document both segments; `key` stored in JSON must be the **full** Records map key string.

Minimal `bossDifficulties.ts` shape:

```ts
import { locale } from '../../../host/i18n'
import rows from './bossDifficulties.json'

export interface PbzBossDifficulty {
  readonly key: string
  readonly zh: string
  readonly en: string
  readonly order: number
}

export const pbzBossDifficulties: readonly PbzBossDifficulty[] = Object.freeze(
  rows.map((row) => Object.freeze({ ...row })),
)

const byKey = new Map(pbzBossDifficulties.map((row) => [row.key, row]))

export function getPbzBossDifficulty(key: string): PbzBossDifficulty | undefined {
  return byKey.get(key)
}

export function listPbzBossDifficulties(): readonly PbzBossDifficulty[] {
  return [...pbzBossDifficulties].sort(
    (a, b) => a.order - b.order || a.key.localeCompare(b.key),
  )
}

export function pbzBossDifficultyName(
  key: string,
  language: 'zh' | 'en' = locale.value === 'en' ? 'en' : 'zh',
): string {
  const row = byKey.get(key)
  if (!row) return key
  if (language === 'en') return row.en || row.zh || key
  return row.zh || row.en || key
}
```

- [ ] **Step 4: Run catalog tests — expect PASS**

- [ ] **Step 5: Commit**

```powershell
git add src/games/phantom-blade-zero/catalog/bossDifficulties.json src/games/phantom-blade-zero/catalog/bossDifficulties.ts src/games/phantom-blade-zero/catalog/SOURCE.md scripts/pbz-build-boss-difficulties.mts tests/phantom-blade-zero/boss-difficulties-catalog.spec.ts
git commit -m "feat(pbz): add boss difficulty whitelist catalog from game unpack"
```

---

### Task 2: `setBossDifficultyKey` + i18n error strings + tests

**Files:**
- Modify: `src/games/phantom-blade-zero/model/bossRecords.ts`
- Modify: `src/games/phantom-blade-zero/model/saveModel.ts` (re-export)
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts` (`error.*` only in this task)
- Test: extend `tests/phantom-blade-zero/saveModel.spec.ts`
- Test: add `tests/phantom-blade-zero/boss-difficulty-i18n.spec.ts`

**Interfaces:**
- Consumes: `getPbzBossDifficulty`, `pbzBossDifficultyName` from Task 1; existing `requireSlot` / `getRecord` helpers in `bossRecords.ts`
- Produces: `export function setBossDifficultyKey(model: PbzDeathSaveModel, slotName: string, bossId: string, fromKey: string, toKey: string): void`

- [ ] **Step 1: Write failing model tests**

```ts
import { ModuleError } from '@sdk/error'
import { translateError } from '@host/i18n'
// plus existing createSaveModel / slot helpers in saveModel.spec.ts

it('moves a boss Records entry to another difficulty key', () => {
  const editable = slot('AutoSave0', {
    BossRecord: {
      BP_Monster_PengMeng_Axe: {
        ClassPath: '/x/C',
        Records: {
          '0_2': { AttemptCount: 16, KillCount: 1, BestTimeMs: 10, extra: true },
        },
      },
    },
  })
  const model = createSaveModel([editable])
  setBossDifficultyKey(model, 'AutoSave0', 'BP_Monster_PengMeng_Axe', '0_2', '0_3')
  const records = (editable.document.BossRecord as any).BP_Monster_PengMeng_Axe.Records
  expect(records['0_2']).toBeUndefined()
  expect(records['0_3']).toEqual({
    AttemptCount: 16,
    KillCount: 1,
    BestTimeMs: 10,
    extra: true,
  })
  expect(editable.dirty).toBe(true)
})

it('no-ops when fromKey === toKey', () => {
  const editable = slot('AutoSave0', {
    BossRecord: {
      BP_Monster_PengMeng_Axe: {
        Records: { '0_2': { AttemptCount: 1, KillCount: 1 } },
      },
    },
  })
  const model = createSaveModel([editable])
  setBossDifficultyKey(model, 'AutoSave0', 'BP_Monster_PengMeng_Axe', '0_2', '0_2')
  expect(editable.dirty).toBe(false)
})

it('refuses unknown toKey, missing fromKey, and conflicts with dedicated codes', () => {
  const editable = slot('AutoSave0', {
    BossRecord: {
      BP_Monster_PengMeng_Axe: {
        Records: {
          '0_2': { AttemptCount: 1, KillCount: 1 },
          '0_3': { AttemptCount: 2, KillCount: 1 },
        },
      },
    },
  })
  const model = createSaveModel([editable])

  expect(() =>
    setBossDifficultyKey(model, 'AutoSave0', 'BP_Monster_PengMeng_Axe', '0_2', '9_9'),
  ).toThrow(ModuleError)
  try {
    setBossDifficultyKey(model, 'AutoSave0', 'BP_Monster_PengMeng_Axe', '0_2', '9_9')
  } catch (e) {
    expect((e as ModuleError).code).toBe('PBZ_BOSS_DIFFICULTY_UNKNOWN')
  }

  try {
    setBossDifficultyKey(model, 'AutoSave0', 'BP_Monster_PengMeng_Axe', '0_1', '0_2')
  } catch (e) {
    expect((e as ModuleError).code).toBe('PBZ_BOSS_DIFFICULTY_MISSING')
  }

  try {
    setBossDifficultyKey(model, 'AutoSave0', 'BP_Monster_PengMeng_Axe', '0_2', '0_3')
  } catch (e) {
    expect((e as ModuleError).code).toBe('PBZ_BOSS_DIFFICULTY_CONFLICT')
  }
})
```

Use a `toKey` that is **absent** from catalog for UNKNOWN (adjust `'9_9'` if catalog somehow includes it — pick any string not in JSON). For CONFLICT use two real keys both present on the same boss.

- [ ] **Step 2: Write failing i18n test**

```ts
import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { locale, translateError } from '@host/i18n'

const codes = [
  'PBZ_BOSS_DIFFICULTY_UNKNOWN',
  'PBZ_BOSS_DIFFICULTY_MISSING',
  'PBZ_BOSS_DIFFICULTY_CONFLICT',
] as const

describe('PBZ boss difficulty error i18n', () => {
  for (const lang of ['zh', 'en'] as const) {
    it(`translates all codes in ${lang} without returning the bare code`, () => {
      locale.value = lang
      for (const code of codes) {
        const message = translateError(new ModuleError(code, ['A', 'B', 'C']))
        expect(message).not.toBe(code)
        expect(message.length).toBeGreaterThan(0)
      }
    })
  }
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```powershell
npx vitest run tests/phantom-blade-zero/saveModel.spec.ts tests/phantom-blade-zero/boss-difficulty-i18n.spec.ts
```

- [ ] **Step 4: Implement `setBossDifficultyKey`**

In `bossRecords.ts`:

```ts
import { getPbzBossDifficulty, pbzBossDifficultyName } from '../catalog/bossDifficulties'

export function setBossDifficultyKey(
  model: PbzDeathSaveModel,
  slotName: string,
  bossId: string,
  fromKey: string,
  toKey: string,
): void {
  const slot = requireSlot(model, slotName)
  if (fromKey === toKey) return

  if (!getPbzBossDifficulty(toKey)) {
    throw new ModuleError('PBZ_BOSS_DIFFICULTY_UNKNOWN', [
      pbzBossDifficultyName(toKey),
    ])
  }

  const root = getRecord(slot.document, 'BossRecord')
  const boss = root ? getRecord(root, bossId) : null
  const records = boss ? getRecord(boss, 'Records') : null
  if (!records || !Object.prototype.hasOwnProperty.call(records, fromKey)) {
    throw new ModuleError('PBZ_BOSS_DIFFICULTY_MISSING', [
      bossId,
      pbzBossDifficultyName(fromKey),
    ])
  }
  if (Object.prototype.hasOwnProperty.call(records, toKey)) {
    throw new ModuleError('PBZ_BOSS_DIFFICULTY_CONFLICT', [
      bossId,
      pbzBossDifficultyName(fromKey),
      pbzBossDifficultyName(toKey),
    ])
  }

  records[toKey] = records[fromKey]
  delete records[fromKey]
  slot.dirty = true
}
```

Re-export from `saveModel.ts` next to other boss APIs.

Add i18n (exact wording may be polished, meaning must stay):

```ts
// zh error.*
PBZ_BOSS_DIFFICULTY_UNKNOWN: '无效的难度：{0}',
PBZ_BOSS_DIFFICULTY_MISSING: 'BOSS {0} 没有「{1}」难度的战绩，无法改挂',
PBZ_BOSS_DIFFICULTY_CONFLICT: '无法将 {0} 从「{1}」改到「{2}」：目标难度已有记录',

// en error.*
PBZ_BOSS_DIFFICULTY_UNKNOWN: 'Invalid difficulty: {0}',
PBZ_BOSS_DIFFICULTY_MISSING: 'Boss {0} has no record on difficulty "{1}" to move',
PBZ_BOSS_DIFFICULTY_CONFLICT: 'Cannot move {0} from "{1}" to "{2}": target difficulty already has a record',
```

- [ ] **Step 5: Run tests — expect PASS**

- [ ] **Step 6: Commit**

```powershell
git add src/games/phantom-blade-zero/model/bossRecords.ts src/games/phantom-blade-zero/model/saveModel.ts src/host/i18n/zh.ts src/host/i18n/en.ts tests/phantom-blade-zero/saveModel.spec.ts tests/phantom-blade-zero/boss-difficulty-i18n.spec.ts
git commit -m "feat(pbz): re-key boss Records difficulty with localized errors"
```

---

### Task 3: RecordsTab dropdown + risk copy + docs

**Files:**
- Modify: `src/games/phantom-blade-zero/views/RecordsTab.vue`
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts` (`pbz.records.*`)
- Modify: `docs/games/phantom-blade-zero.md`, `docs/games/phantom-blade-zero.en.md`
- Modify: `docs/HANDTEST.md`
- Modify: `CHANGELOG.md`, `CHANGELOG.en.md` (Unreleased bullet; version bump is a later release task)
- Test: extend `tests/phantom-blade-zero/views.spec.ts` (assert risk key / difficulty strings exist in i18n sources or component import path — match existing views.spec style)

**Interfaces:**
- Consumes: `setBossDifficultyKey`, `listPbzBossDifficulties`, `pbzBossDifficultyName`, `translateError`, `ModuleError`

- [ ] **Step 1: Failing / characterizing check** — add assertion that `pbz.records.difficultyRisk` (new key) is present in zh/en once added; temporarily expect missing then implement.

- [ ] **Step 2: Wire UI**

Replace readonly difficulty column with:

```vue
<el-table-column :label="t('pbz.records.difficulty')" min-width="140">
  <template #default="{ row }">
    <el-select
      :model-value="row.difficultyKey"
      @update:model-value="(value) => changeBossDifficulty(row.bossId, row.difficultyKey, value)"
    >
      <el-option
        v-for="opt in difficultyOptions"
        :key="opt.key"
        :label="difficultyLabel(opt.key)"
        :value="opt.key"
      />
    </el-select>
  </template>
</el-table-column>
```

Script pieces:

```ts
import { ModuleError } from '@sdk/error'
import { translateError } from '@host/i18n'
import { listPbzBossDifficulties, pbzBossDifficultyName } from '../catalog/bossDifficulties'
import { setBossDifficultyKey } from '../model/saveModel'

const difficultyOptions = listPbzBossDifficulties()

function difficultyLabel(key: string): string {
  const language = locale.value === 'en' ? 'en' : 'zh'
  return pbzBossDifficultyName(key, language)
}

function changeBossDifficulty(bossId: string, fromKey: string, toKey: string | null): void {
  if (!toKey || toKey === fromKey) return
  try {
    editor.markDirty(() =>
      setBossDifficultyKey(editor.save.model, selectedSlotName.value, bossId, fromKey, toKey),
    )
  } catch (e) {
    window.alert(translateError(e instanceof ModuleError ? e : e))
  }
}
```

If current `row.difficultyKey` is **not** in catalog, still show it selected: either prepend a one-off option for the raw key (disabled label) or keep `el-option` for current key so the select is not empty — prefer: options = `listPbzBossDifficulties()`, and if current key missing from list, concat `{ key: row.difficultyKey }` for display only; changing away still requires `toKey` ∈ catalog (enforced by model).

Add `el-alert` near top (warning): `t('pbz.records.difficultyRisk')`.

i18n UI strings:

```ts
// zh pbz.records
difficultyRisk: '修改 BOSS 战绩难度可能影响游戏内或小黑盒展示，请先备份存档。',

// en pbz.records
difficultyRisk: 'Changing boss record difficulty may affect in-game or HeyBox display. Back up your save first.',
```

Keep column label `difficulty` (already「难度」/ existing en).

- [ ] **Step 3: Docs**

- `docs/games/phantom-blade-zero.md` / `.en.md`: Records bullet — can re-hang existing difficulty keys via whitelist dropdown; refuse if target exists; does not fabricate clears.
- `docs/HANDTEST.md`: checkbox — change one boss difficulty on a copy → load in game / confirm record under new difficulty.
- `CHANGELOG.md` / `.en.md` under Unreleased **新增/Added**.

- [ ] **Step 4: Run**

```powershell
npx vitest run tests/phantom-blade-zero --exclude "**/_*"
```

Expected: all pass (with `PBZ_SAVE` optional; e2e should not break).

- [ ] **Step 5: Commit**

```powershell
git add src/games/phantom-blade-zero/views/RecordsTab.vue src/host/i18n/zh.ts src/host/i18n/en.ts docs/games/phantom-blade-zero.md docs/games/phantom-blade-zero.en.md docs/HANDTEST.md CHANGELOG.md CHANGELOG.en.md tests/phantom-blade-zero/views.spec.ts
git commit -m "feat(pbz): Records tab difficulty dropdown and docs"
```

---

### Task 4: Manual verification gate (before release)

- [ ] **Step 1:** On a **copy** of a real save, re-key one defeated boss `0_2` → another whitelist key; save from SaveSmith; load in game; confirm record shows under new difficulty (or HeyBox equivalent).
- [ ] **Step 2:** Tick HANDTEST item; note any catalog gaps discovered → fix JSON + SOURCE if needed (follow-up commit).
- [ ] **Step 3:** Do **not** bump version / tag in this plan — use existing RELEASE.md flow when user asks to ship.

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Dropdown re-hang existing row | 3 |
| Full whitelist from unpack | 1 |
| Refuse target collision | 2 |
| Refuse unknown toKey | 2 |
| Whole-object move, no field edits | 2 |
| Localized friendly errors | 2 (+ UI catch in 3) |
| Unknown keys don't block save validate | (unchanged `collectBossRecordIssues` — no task adds catalog check there) |
| Docs / HANDTEST / CHANGELOG | 3 |
| Real-save handtest | 4 |
| No fabricate / merge / KillCount / runtime pak read | Global Constraints |

## Placeholder / consistency scan

- Error code names locked above; display helpers use `pbzBossDifficultyName`.
- Catalog API names locked for Tasks 2–3.
- No TBD steps; unpack asset paths filled into SOURCE during Task 1 execution (cannot pre-list until unpack runs — that is an explicit Task 1 deliverable, not a plan placeholder).
