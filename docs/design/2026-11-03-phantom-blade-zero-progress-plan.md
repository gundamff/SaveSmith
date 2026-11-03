# Phantom Blade Zero Progress Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Progress tab (cycle display + game time HMS) and editable boss best clear time on the Records tab for `phantom-blade-zero`.

**Architecture:** Pure model helpers over existing internal-slot JSON (`PBZGameSystem`, `BossRecord.*.BestTimeMs`); shared HMS↔seconds helpers; Vue tabs via `usePbzEditor` + `markDirty`. No container/crypto changes. Unknown fields keep passthrough.

**Tech Stack:** TypeScript, Vue 3, Element Plus, Vitest, existing PBZ module patterns.

**Spec:** [2026-11-03-phantom-blade-zero-progress-design.md](./2026-11-03-phantom-blade-zero-progress-design.md)

## Global Constraints

- Module must not touch `fs` or invoke Tauri; only `Uint8Array` / in-memory `GameState`.
- Do not edit `CycleRecords`, Ending*, Nightmare*, `bIsFinishGame`.
- Do not create missing `BestTimeMs` / `HasGameTime` / `CurrentCycleGameTime` / `CycleCount` keys; only mutate when already present (game time requires **both** time fields present).
- Game time write: set `HasGameTime` and `CurrentCycleGameTime` to the **same** seconds value.
- Cycle UI: display `CycleCount + 1`; write `CycleCount = display - 1`; range `CycleCount ∈ 0..99`.
- Time seconds range: `0..3599999`. Boss UI seconds → `BestTimeMs = seconds * 1000` (sub-second discarded).
- i18n keys under `pbz.*`; error codes `PBZ_INVALID_CYCLE_COUNT`, `PBZ_INVALID_GAME_TIME`, `PBZ_INVALID_BOSS_BEST_TIME`.
- No player real saves committed to git. `PBZ_SAVE` tests stay env-gated.
- Commits only when the user explicitly asks (repo rule); plan commit steps are optional checkpoints.

## File map

| File | Role |
|------|------|
| `src/games/phantom-blade-zero/model/durationFormat.ts` | HMS ↔ total seconds |
| `src/games/phantom-blade-zero/model/progress.ts` | Progress project / set / validate issues |
| `src/games/phantom-blade-zero/model/bossRecords.ts` | `setBossBestTimeMs` + BestTimeMs issue collection |
| `src/games/phantom-blade-zero/model/saveModel.ts` | Re-export + call `collectProgressIssues` |
| `src/games/phantom-blade-zero/views/ProgressTab.vue` | New tab UI |
| `src/games/phantom-blade-zero/views/RecordsTab.vue` | Best-time column |
| `src/games/phantom-blade-zero/views/index.ts` | Register progress tab |
| `src/host/i18n/zh.ts` / `en.ts` | Labels + error strings |
| `tests/phantom-blade-zero/durationFormat.spec.ts` | HMS unit tests |
| `tests/phantom-blade-zero/saveModel.spec.ts` | Progress + best-time model tests |
| `tests/phantom-blade-zero/e2e-real-save.spec.ts` | Optional read assertions when `PBZ_SAVE` set |
| `docs/games/phantom-blade-zero.md` + `.en.md`, `docs/HANDTEST.md`, `CHANGELOG*.md` | Docs |

---

### Task 1: HMS duration helpers

**Files:**
- Create: `src/games/phantom-blade-zero/model/durationFormat.ts`
- Test: `tests/phantom-blade-zero/durationFormat.spec.ts`

**Interfaces:**
- Produces:
  - `export interface HmsParts { hours: number; minutes: number; seconds: number }`
  - `export const MAX_DURATION_SECONDS = 3_599_999`
  - `export function totalSecondsToHms(totalSeconds: number): HmsParts`
  - `export function hmsToTotalSeconds(parts: HmsParts): number`
  - `export function isValidDurationSeconds(value: unknown): value is number`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  MAX_DURATION_SECONDS,
  hmsToTotalSeconds,
  isValidDurationSeconds,
  totalSecondsToHms
} from '../../src/games/phantom-blade-zero/model/durationFormat'

describe('pbz durationFormat', () => {
  it('round-trips HMS and clamps component ranges on encode path via total seconds', () => {
    expect(totalSecondsToHms(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 })
    expect(hmsToTotalSeconds({ hours: 1, minutes: 1, seconds: 1 })).toBe(3661)
    expect(totalSecondsToHms(141636)).toEqual({ hours: 39, minutes: 20, seconds: 36 })
    expect(isValidDurationSeconds(0)).toBe(true)
    expect(isValidDurationSeconds(MAX_DURATION_SECONDS)).toBe(true)
    expect(isValidDurationSeconds(MAX_DURATION_SECONDS + 1)).toBe(false)
    expect(isValidDurationSeconds(-1)).toBe(false)
    expect(isValidDurationSeconds(1.5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/phantom-blade-zero/durationFormat.spec.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Minimal implementation**

```ts
export interface HmsParts {
  hours: number
  minutes: number
  seconds: number
}

export const MAX_DURATION_SECONDS = 3_599_999

export function isValidDurationSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_DURATION_SECONDS
}

export function totalSecondsToHms(totalSeconds: number): HmsParts {
  if (!isValidDurationSeconds(totalSeconds)) {
    throw new RangeError('invalid duration seconds')
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { hours, minutes, seconds }
}

export function hmsToTotalSeconds(parts: HmsParts): number {
  const { hours, minutes, seconds } = parts
  if (
    !Number.isSafeInteger(hours) ||
    !Number.isSafeInteger(minutes) ||
    !Number.isSafeInteger(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new RangeError('invalid HMS parts')
  }
  const total = hours * 3600 + minutes * 60 + seconds
  if (!isValidDurationSeconds(total)) throw new RangeError('invalid duration seconds')
  return total
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/phantom-blade-zero/durationFormat.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/games/phantom-blade-zero/model/durationFormat.ts tests/phantom-blade-zero/durationFormat.spec.ts
git commit -m "test(pbz): add HMS duration helpers for progress editing"
```

---

### Task 2: Progress model (`PBZGameSystem`)

**Files:**
- Create: `src/games/phantom-blade-zero/model/progress.ts`
- Modify: `src/games/phantom-blade-zero/model/saveModel.ts` (re-export + `collectProgressIssues` in `validateDocument`)
- Test: `tests/phantom-blade-zero/saveModel.spec.ts` (extend)

**Interfaces:**
- Consumes: `isValidDurationSeconds` from `durationFormat.ts`; slot shape `{ name, document, dirty }`
- Produces:
  - `export interface ProgressView { cycleCount: number; cycleDisplay: number; gameTimeSeconds: number; hasGameTime: number | null; currentCycleGameTime: number | null; timesMismatch: boolean; cycleRecordCount: number; cycleEditable: boolean; gameTimeEditable: boolean; hasGameSystem: boolean }`
  - `export function projectProgress(slot): ProgressView`
  - `export function setCycleDisplay(model, slotName, displayWeek: number): void` — writes `CycleCount = displayWeek - 1`
  - `export function setGameTimeSeconds(model, slotName, seconds: number): void` — writes both time fields
  - `export function collectProgressIssues(slot, issues): void`
  - Invalid edits throw `ModuleError('PBZ_INVALID_EDIT', ...)` matching existing setters; validate issues use `PBZ_INVALID_CYCLE_COUNT` / `PBZ_INVALID_GAME_TIME`

**ProgressView rules (exact):**

- `hasGameSystem`: `PBZGameSystem` plain object present
- `cycleEditable`: `CycleCount` already present and safe integer in `0..99`
- `cycleCount`: that value, else `NaN`; `cycleDisplay = cycleCount + 1` when finite
- `gameTimeEditable`: both `HasGameTime` and `CurrentCycleGameTime` present and each is safe integer in `0..3599999`
- `gameTimeSeconds`: if `gameTimeEditable`, use `CurrentCycleGameTime`; else `NaN`
- `timesMismatch`: both present as numbers and `!==`
- `cycleRecordCount`: `Object.keys(CycleRecords || {}).length` if object, else `0`
- `setGameTimeSeconds` / `setCycleDisplay`: no-op if value unchanged; mark `slot.dirty = true` on change
- Never mutate `CycleRecords`

- [ ] **Step 1: Write failing tests** (append to `saveModel.spec.ts`)

```ts
import {
  projectProgress,
  setCycleDisplay,
  setGameTimeSeconds
} from '../../src/games/phantom-blade-zero/model/saveModel'

it('projects progress and writes cycle display as CycleCount+1', () => {
  const editable = slot('AutoSave0', {
    PBZGameSystem: {
      CycleCount: 0,
      HasGameTime: 100,
      CurrentCycleGameTime: 100,
      CycleRecords: { '0': { Ending: 3 } },
      keep: true
    }
  })
  expect(projectProgress(editable)).toMatchObject({
    cycleCount: 0,
    cycleDisplay: 1,
    gameTimeSeconds: 100,
    cycleEditable: true,
    gameTimeEditable: true,
    cycleRecordCount: 1,
    timesMismatch: false,
    hasGameSystem: true
  })
  const model = createSaveModel([editable])
  setCycleDisplay(model, editable.name, 2)
  expect((editable.document.PBZGameSystem as any).CycleCount).toBe(1)
  expect((editable.document.PBZGameSystem as any).keep).toBe(true)
  expect((editable.document.PBZGameSystem as any).CycleRecords).toEqual({ '0': { Ending: 3 } })
})

it('unifies HasGameTime and CurrentCycleGameTime on game time edit', () => {
  const editable = slot('ManualSave1', {
    PBZGameSystem: {
      CycleCount: 1,
      HasGameTime: 50,
      CurrentCycleGameTime: 60
    }
  })
  expect(projectProgress(editable).timesMismatch).toBe(true)
  expect(projectProgress(editable).gameTimeSeconds).toBe(60)
  const model = createSaveModel([editable])
  setGameTimeSeconds(model, editable.name, 3661)
  expect(editable.document.PBZGameSystem).toMatchObject({
    HasGameTime: 3661,
    CurrentCycleGameTime: 3661
  })
})

it('rejects out-of-range cycle/time and disables when fields missing', () => {
  const missingTime = slot('AutoSave0', { PBZGameSystem: { CycleCount: 0, HasGameTime: 1 } })
  expect(projectProgress(missingTime).gameTimeEditable).toBe(false)
  const model = createSaveModel([missingTime])
  expectModuleError(() => setGameTimeSeconds(model, missingTime.name, 1), 'PBZ_INVALID_EDIT')
  expectModuleError(() => setCycleDisplay(model, missingTime.name, 0), 'PBZ_INVALID_EDIT') // display 0 => CycleCount -1
  expectModuleError(() => setCycleDisplay(model, missingTime.name, 101), 'PBZ_INVALID_EDIT')
})
```

Also assert `validateSaveModel` reports `PBZ_INVALID_CYCLE_COUNT` / `PBZ_INVALID_GAME_TIME` when existing fields are out of range (e.g. `CycleCount: -1`, `HasGameTime: 9_999_999` with matching current).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/phantom-blade-zero/saveModel.spec.ts -t "projects progress|unifies HasGameTime|rejects out-of-range cycle"`

Expected: FAIL (exports missing)

- [ ] **Step 3: Implement `progress.ts` and wire `saveModel.ts`**

Implement helpers mirroring `bossRecords.ts` style (`getRecord`, `isIntegerInRange`, `requireSlot` with `EDITABLE_SLOT_NAME`).

In `saveModel.ts`:

```ts
import { collectProgressIssues } from './progress'
export {
  projectProgress,
  setCycleDisplay,
  setGameTimeSeconds,
  type ProgressView
} from './progress'
// inside validateDocument, after collectBossRecordIssues:
collectProgressIssues(slot, issues)
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/phantom-blade-zero/saveModel.spec.ts`

Expected: all PASS

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/games/phantom-blade-zero/model/progress.ts src/games/phantom-blade-zero/model/saveModel.ts tests/phantom-blade-zero/saveModel.spec.ts
git commit -m "feat(pbz): editable CycleCount and dual game-time scalars"
```

---

### Task 3: Boss `BestTimeMs` setter

**Files:**
- Modify: `src/games/phantom-blade-zero/model/bossRecords.ts`
- Modify: `src/games/phantom-blade-zero/model/saveModel.ts` (re-export)
- Test: `tests/phantom-blade-zero/saveModel.spec.ts`

**Interfaces:**
- Consumes: existing `projectBossRecords` / entry lookup pattern; `isValidDurationSeconds`
- Produces:
  - `export function setBossBestTimeSeconds(model, slotName, bossId, difficultyKey, seconds: number): void`
  - Writes `BestTimeMs = seconds * 1000` only if entry already has integer `BestTimeMs`
  - Extend `collectBossRecordIssues` to flag invalid existing `BestTimeMs` with `PBZ_INVALID_BOSS_BEST_TIME`

- [ ] **Step 1: Failing tests**

```ts
it('sets boss best time from seconds into BestTimeMs without touching kill fields', () => {
  const editable = slot('AutoSave0', {
    BossRecord: {
      BP_Monster_PengMeng_Axe: {
        Records: {
          '0_2': { AttemptCount: 16, KillCount: 1, BestTimeMs: 204362, extra: true }
        }
      },
      BP_Monster_MoTian_LongZhu_01: {
        Records: { '0_2': { AttemptCount: 15 } }
      }
    }
  })
  const model = createSaveModel([editable])
  setBossBestTimeSeconds(model, editable.name, 'BP_Monster_PengMeng_Axe', '0_2', 168)
  const axe = (editable.document.BossRecord as any).BP_Monster_PengMeng_Axe.Records['0_2']
  expect(axe).toEqual({
    AttemptCount: 16,
    KillCount: 1,
    BestTimeMs: 168_000,
    extra: true
  })
  expectModuleError(
    () => setBossBestTimeSeconds(model, editable.name, 'BP_Monster_MoTian_LongZhu_01', '0_2', 10),
    'PBZ_INVALID_EDIT'
  )
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/phantom-blade-zero/saveModel.spec.ts -t "sets boss best time"`

- [ ] **Step 3: Implement `setBossBestTimeSeconds` + export**

```ts
export function setBossBestTimeSeconds(
  model: PbzDeathSaveModel,
  slotName: string,
  bossId: string,
  difficultyKey: string,
  seconds: number
): void {
  const slot = requireSlot(model, slotName)
  if (!isValidDurationSeconds(seconds)) throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  const entry = /* resolve Records[difficultyKey] same as setBossDeathCount */
  if (!isIntegerInRange(entry.BestTimeMs, 0, Number.MAX_SAFE_INTEGER)) {
    throw new ModuleError('PBZ_INVALID_EDIT', [bossId])
  }
  const next = seconds * 1000
  if (entry.BestTimeMs === next) return
  entry.BestTimeMs = next
  slot.dirty = true
}
```

Import `isValidDurationSeconds` from `./durationFormat`.

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/phantom-blade-zero/saveModel.spec.ts`

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/games/phantom-blade-zero/model/bossRecords.ts src/games/phantom-blade-zero/model/saveModel.ts tests/phantom-blade-zero/saveModel.spec.ts
git commit -m "feat(pbz): edit boss BestTimeMs via whole seconds"
```

---

### Task 4: ProgressTab + Records best-time column + i18n

**Files:**
- Create: `src/games/phantom-blade-zero/views/ProgressTab.vue`
- Modify: `src/games/phantom-blade-zero/views/RecordsTab.vue`
- Modify: `src/games/phantom-blade-zero/views/index.ts`
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts`
- Test: `tests/phantom-blade-zero/views.spec.ts` (extend if it mounts tabs; otherwise rely on typecheck + model tests)

**Interfaces:**
- Consumes: `projectProgress`, `setCycleDisplay`, `setGameTimeSeconds`, `setBossBestTimeSeconds`, `totalSecondsToHms`, `hmsToTotalSeconds`, slot selection helpers from RecordsTab pattern
- Tab order: resources → records → progress

- [ ] **Step 1: i18n keys**

`zh.ts` / `en.ts` under `pbz`:

```ts
tabs: {
  resources: '...',
  records: '...',
  progress: '进度' // en: 'Progress'
},
progress: {
  cycleDisplay: '周目（第 N 周目）', // en: 'Cycle (week N)'
  cycleHint: '存档字段为 CycleCount；界面显示为 CycleCount+1。以游戏内为准，不修改历史周目履历。',
  gameTime: '游戏时间',
  hours: '时',
  minutes: '分',
  seconds: '秒',
  cycleRecordsReadonly: '历史周目记录 {0} 条（只读）',
  timesMismatch: 'HasGameTime 与 CurrentCycleGameTime 不一致；保存游戏时间时将写成同一值。',
  empty: '当前槽没有 PBZGameSystem 进度块',
  gameTimeDisabled: '缺少成对的游戏时间字段，无法编辑'
},
records: {
  // existing...
  bestTime: '最佳用时',
  bestTimeMissing: '—'
}
```

Error map:

```ts
PBZ_INVALID_CYCLE_COUNT: '槽位 {0} 的 CycleCount 无效',
PBZ_INVALID_GAME_TIME: '槽位 {0} 的游戏时间无效',
PBZ_INVALID_BOSS_BEST_TIME: '槽位 {0} 的 BOSS 最佳用时无效：{1}'
```

- [ ] **Step 2: Register tab**

```ts
import ProgressTab from './ProgressTab.vue'
export const pbzViews = [
  { id: 'resources', labelKey: 'pbz.tabs.resources', component: ResourcesTab },
  { id: 'records', labelKey: 'pbz.tabs.records', component: RecordsTab },
  { id: 'progress', labelKey: 'pbz.tabs.progress', component: ProgressTab }
]
```

- [ ] **Step 3: Implement `ProgressTab.vue`**

Mirror `RecordsTab` slot select + warnings. Form:

- `el-input-number` for cycle display (`:min="1" :max="100"`), disabled when `!cycleEditable`
- Three `el-input-number` (h / m / s) bound from `totalSecondsToHms(gameTimeSeconds)`; on change call `hmsToTotalSeconds` then `setGameTimeSeconds` inside `editor.markDirty`
- Use `@update:model-value` (not `v-model`) per host editorBindings rules
- Show readonly cycle record count + mismatch alert when needed
- Empty state when `!hasGameSystem`

- [ ] **Step 4: Extend `RecordsTab.vue`**

Add column after defeated (or before deaths):

- If `row.bestTimeMs == null` → show `t('pbz.records.bestTimeMissing')`
- Else show three HMS inputs from `Math.round(row.bestTimeMs / 1000)` clamped via `isValidDurationSeconds`; on commit `setBossBestTimeSeconds(...)`

- [ ] **Step 5: Typecheck / views tests**

Run:

```powershell
npx vitest run tests/phantom-blade-zero
npm run typecheck
```

Expected: PASS

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add src/games/phantom-blade-zero/views src/host/i18n/zh.ts src/host/i18n/en.ts tests/phantom-blade-zero
git commit -m "feat(pbz): Progress tab and boss best-time HMS editors"
```

---

### Task 5: Docs, real-save gate, verification

**Files:**
- Modify: `docs/games/phantom-blade-zero.md`, `docs/games/phantom-blade-zero.en.md`
- Modify: `docs/HANDTEST.md` (add PBZ7)
- Modify: `CHANGELOG.md`, `CHANGELOG.en.md`
- Modify: `tests/phantom-blade-zero/e2e-real-save.spec.ts` (read-only progress assertions)

- [ ] **Step 1: Docs**

Document editable fields:

- Progress: `CycleCount` (UI week N), `HasGameTime` + `CurrentCycleGameTime` (HMS, dual-write)
- Records: `BestTimeMs` via whole seconds
- Non-goals: CycleRecords / endings / nightmare
- Note BestTimeMs second precision loss; cycle semantics “in-game wins”

HANDTEST PBZ7:

```markdown
### PBZ7. 进度与 BOSS 用时（副本）

- [ ] 进度 Tab：改「第 N 周目」与游戏时间 → 进游戏看摘要是否变化
- [ ] 战绩 Tab：改一已有 BestTime 的 BOSS 用时 → 进游戏或战绩展示对照
- [ ] 未遭遇 / 无 BestTimeMs 的行不可伪造用时
- [ ] 小黑盒若解析失败：进游戏加载并再保存一次（zlib→Oodle）
```

- [ ] **Step 2: e2e read assertion** (inside `describe.skipIf(!SAVE)`)

```ts
it('projects progress scalars and some boss best times when present', async () => {
  const state = await parseOriginal()
  let sawProgress = false
  let sawBest = false
  for (const slot of state.model.slots) {
    const p = projectProgress(slot)
    if (p.hasGameSystem && p.cycleEditable && p.gameTimeEditable) sawProgress = true
    for (const row of projectBossRecords(slot)) {
      if (row.bestTimeMs != null) sawBest = true
    }
  }
  expect(sawProgress).toBe(true)
  // sawBest may be false on some saves; if false, do not fail hard — only assert when any BossRecord exists
})
```

Prefer: if any slot has `BossRecord` entries from `projectBossRecords`, then expect at least one `bestTimeMs != null` **or** document that HeyBox NG+ sample is the reference; for the user's save both are true — keep assertion `expect(sawProgress).toBe(true)` and `expect(sawBest).toBe(true)` when running against that path locally.

- [ ] **Step 3: Full verify**

```powershell
npm test
npm run typecheck
```

Paste output. Do not claim game acceptance without user HANDTEST.

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add docs CHANGELOG.md CHANGELOG.en.md tests/phantom-blade-zero/e2e-real-save.spec.ts
git commit -m "docs(pbz): progress tab editable surface and handtest"
```

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| New Progress tab | 4 |
| Dual-write game time + HMS | 1, 2, 4 |
| Cycle display = Count+1 | 2, 4 |
| BestTimeMs on Records | 3, 4 |
| No CycleRecords / ending / nightmare edits | 2 (explicit non-touch) |
| Validate ranges / missing fields | 2, 3 |
| Docs / HANDTEST / CHANGELOG | 5 |
| PBZ_SAVE read gate | 5 |

## Placeholder / consistency check

- No TBD left.
- Setter name unified: `setBossBestTimeSeconds` (seconds in, ms stored).
- `setCycleDisplay` / `setGameTimeSeconds` / `projectProgress` names stable across tasks.
- Tab id `progress`, i18n `pbz.tabs.progress`.
