# Eslabong 完整改档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only Eslabong module into a pure-TypeScript save editor that can rewrite `.res` + sidecar after editing global resources, existing fighters, and existing item roll stats — and have the game accept the save.

**Architecture:** Keep `src/games/eslabong/` as one `GameModule`. Pipeline: RSCC decompress → Godot binary Resource model (whitelist + opaque passthrough) → edit APIs → serialize → RSCC compress → recompute sidecar `integrity`. UI tabs: Overview / Fighters / Items. Godot on the developer machine is only for black-box integrity/RSCC checks; never shipped.

**Tech Stack:** Vue 3, Element Plus, Vitest, TypeScript, existing `zstd-codec` + `rscc.ts`, Tauri host I/O unchanged.

**Spec:** `docs/design/2026-09-21-eslabong-full-design.md`

## Global Constraints

- Module never touches `fs` or Tauri `invoke`
- Pure TypeScript product path — do not bundle Godot
- Edit existing entities only — no add/delete fighters or item instances
- PVP / Challenge Tower fields: opaque passthrough, no UI
- Until `integrity` is verified against a real load in-game, keep Save disabled (read-only open allowed)
- Sync sidecar `gold` with `.res` `player_gold` on every save
- `highest_renown_reached = max(old, new renown)`
- Do not commit real player saves; optional e2e gated by `ESLABONG_SAVE`
- i18n keys under `es.`
- Commits only when the user explicitly asks (repo rule overrides per-task commit checkboxes unless requested)

## File map

| Path | Responsibility |
|------|----------------|
| `src/games/eslabong/rscc.ts` | Existing RSCC codec (extend tests for real-save gate) |
| `src/games/eslabong/resource/binary.ts` | Godot binary Resource parse/serialize + path get/set |
| `src/games/eslabong/integrity.ts` | Sidecar integrity (+ hmac if required) |
| `src/games/eslabong/model/types.ts` | `EslabongState`, fighter/item row types |
| `src/games/eslabong/model/fields.ts` | Locked whitelist field paths (appendix of truth) |
| `src/games/eslabong/model/club.ts` | gold / renown / development_stars |
| `src/games/eslabong/model/fighters.ts` | Roster projection + mutators |
| `src/games/eslabong/model/items.ts` | Owned instances + roll stats mutators |
| `src/games/eslabong/catalog/fromSave.ts` | Enumerate `res://` / enums seen in current save |
| `src/games/eslabong/parse.ts` | parse / serialize / validate (replace passthrough serialize) |
| `src/games/eslabong/actions.ts` | max-level / clear-injury |
| `src/games/eslabong/views/OverviewTab.vue` | Editable globals |
| `src/games/eslabong/views/FightersTab.vue` | Fighter editor |
| `src/games/eslabong/views/ItemsTab.vue` | Item roll editor |
| `src/games/eslabong/views/index.ts` | Tab registration |
| `src/host/i18n/zh.ts` / `en.ts` | `es.*` strings |
| `tests/eslabong/*.spec.ts` | Unit + optional real-save |
| `docs/games/eslabong.md` / `.en.md` | User docs |
| `scripts/eslabong-integrity-probe.mjs` | Dev-only probe helpers (optional) |

## Gate order (do not skip)

1. Real-save RSCC decompress → recompress → game still loads  
2. `integrity` alignment (change gold, game accepts)  
3. Lock `model/fields.ts` whitelist  
4. UI + mutators  

---

### Task 1: Real-save RSCC gate

**Files:**
- Modify: `src/games/eslabong/rscc.ts` (only if bugs found)
- Test: `tests/eslabong/rscc-real-save.spec.ts`

**Interfaces:**
- Consumes: `decompressRscc`, `compressRscc` from `rscc.ts`
- Produces: confidence that Task 2+ can rewrite `.res` containers

- [ ] **Step 1: Write env-gated failing/skipping test**

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compressRscc, decompressRscc } from '../../src/games/eslabong/rscc'

const src = process.env.ESLABONG_RES
describe.skipIf(!src || !existsSync(src!))('eslabong RSCC real save', () => {
  it('decompress then recompress yields decompressible plaintext of same length', async () => {
    const packed = new Uint8Array(readFileSync(src!))
    const plain = await decompressRscc(packed)
    expect(plain.length).toBeGreaterThan(1_000_000)
    const again = await compressRscc(plain, { blockSize: 4096 })
    const plain2 = await decompressRscc(again)
    expect(plain2.length).toBe(plain.length)
    expect(Buffer.from(plain2).equals(Buffer.from(plain))).toBe(true)
    const out = join(tmpdir(), 'eslabong-rscc-roundtrip.res')
    writeFileSync(out, again)
    // Manual gate: copy over campaign_save_N.res backup and load in game.
    expect(out.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run**

```bash
npx vitest run tests/eslabong/rscc-real-save.spec.ts
```

Expected: skip without `ESLABONG_RES`; pass with path to `campaign_save_2.res`.

- [ ] **Step 3: Hand-verify in game** (required before Task 2)

Replace a **copy** of the slot `.res` with the recompressed file; leave sidecar unchanged. Game must load the slot.

- [ ] **Step 4: Fix `rscc.ts` only if Step 3 fails**

---

### Task 2: Integrity algorithm (blocker)

**Files:**
- Create: `src/games/eslabong/integrity.ts`
- Create: `scripts/eslabong-integrity-probe.mjs` (dev aid; may shell Godot locally)
- Test: `tests/eslabong/integrity.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface SidecarDoc {
  gold: number
  team_name: string
  season: number
  week: number
  // …keep unknown keys when rewriting
  [k: string]: unknown
}

/** Returns hex digest matching game `integrity` field, or throws. */
export function computeIntegrity(args: {
  sidecar: SidecarDoc
  resBytes: Uint8Array
}): string

/** Optionally update hmac fields; default preserve if unused. */
export function applyIntegrityFields(
  sidecar: Record<string, unknown>,
  resBytes: Uint8Array
): Record<string, unknown>
```

- [x] **Step 1: Probe until a hypothesis matches all local slots**

Formula: `integrity = HMAC-SHA256(SHA256(utf8(salt)), raw .res)` with salt `eslabong_v1_9d4f2a7c_save_integrity_salt`. Matches 5/6 local slots (`campaign_autosave_3` is a mismatched json/res pair).

- [x] **Step 2: Write failing test with recorded vector** (committed synthetic or env-gated)

Smoke + optional `ESLABONG_INTEGRITY_VECTOR` in `tests/eslabong/integrity.spec.ts`.

- [x] **Step 3: Implement `computeIntegrity` / `applyIntegrityFields`**

- [ ] **Step 4: Hand-verify**

Hand-test files in `%TEMP%\eslabong-integrity-handtest\` (gold `2919170 → 2919947`, recompressed `.res` + new integrity). Game must load. If game rejects, return to Step 1.

**Exit criteria:** At least one successful in-game load after gold change with recomputed `integrity`.

---

### Task 3: Godot binary Resource codec (passthrough-capable)

**Files:**
- Create: `src/games/eslabong/resource/binary.ts`
- Create: `src/games/eslabong/resource/variant.ts` (Variant wire types as discovered)
- Test: `tests/eslabong/resource-binary.spec.ts`

**Interfaces:**
- Produces:

```ts
export type ResValue =
  | null
  | boolean
  | number
  | string
  | ResValue[]
  | { [k: string]: ResValue }
  | { __raw: Uint8Array; __hint?: string }

export interface ResourceDoc {
  /** Opaque header / string table / unread blobs preserved for rewrite */
  wire: unknown
  /** Convenient property bag for CampaignSave root (best-effort) */
  root: Record<string, ResValue>
}

export function parseResourceBinary(plain: Uint8Array): ResourceDoc
export function serializeResourceBinary(doc: ResourceDoc): Uint8Array
export function getPath(doc: ResourceDoc, path: string): ResValue | undefined
export function setPath(doc: ResourceDoc, path: string, value: ResValue): void
```

- [x] **Step 1: Failing test — synthetic or sliced real plaintext**

- [x] **Step 2: Implement minimal codec**

`resource/binary.ts` + `variant.ts`; unrecognized variants as `__raw`; no-edit round-trip byte-identical on real plaintext.

- [x] **Step 3: Real-save smoke (env-gated)** — hand load OK (gold 8888888 on 存档位3)

Reference: Godot 4.x binary resource layout (version header, string table, external resources, property list). Match engine major used by the game (4.6 export observed in pck header).

---

### Task 4: Lock field whitelist + club globals model

**Files:**
- Create: `src/games/eslabong/model/fields.ts`
- Create: `src/games/eslabong/model/types.ts`
- Create: `src/games/eslabong/model/club.ts`
- Test: `tests/eslabong/club.spec.ts`

**Interfaces:**
- Produces:

```ts
// fields.ts — export const arrays of path strings / keys, commented from real dump
export const CLUB_KEYS = ['player_gold', 'renown', 'development_stars', 'highest_renown_reached'] as const

export interface ClubResources {
  gold: number
  renown: number
  developmentStars: number
  highestRenownReached: number
}

export function readClub(doc: ResourceDoc): ClubResources
export function writeClub(doc: ResourceDoc, next: Partial<ClubResources>): void
```

- [x] **Step 1: Dump paths from real plaintext into `fields.ts` comments + consts**

- [x] **Step 2: Tests for read/write club + highest renown max rule**

```ts
it('writeClub bumps highestRenownReached only upward', () => {
  // highest 100, set renown 80 → highest stays 100
  // set renown 120 → highest 120
})
```

- [x] **Step 3: Implement `club.ts`**

---

### Task 5: Fighters model (growth / personality / skills / injury)

**Files:**
- Create: `src/games/eslabong/model/fighters.ts`
- Modify: `src/games/eslabong/model/fields.ts`
- Test: `tests/eslabong/fighters.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface FighterRow {
  id: string
  displayName: string
  level: number
  experience: number
  growthStyles: ResValue
  birth: Record<string, number>
  growthBase: Record<string, number>
  career: Record<string, number>
  personality: Record<string, number>
  aiProfile: Record<string, number>
  skills: Record<string, string> // skill_01 → res://…
  injured: boolean
  injuryBattlesRemaining: number
  injuryDescription: string
  /** opaque mirror for unlisted props on this instance */
  _ref: unknown
}

export function listFighters(doc: ResourceDoc): FighterRow[]
export function applyFighter(doc: ResourceDoc, row: FighterRow): void
export function clearInjury(row: FighterRow): void
export function maxProgress(row: FighterRow, caps: { maxLevel: number; maxExp: number }): void
```

- [x] **Step 1: Locate roster array path in real save; lock in `fields.ts`**

- [x] **Step 2: Failing tests for list + mutate level/skill/injury without dropping unknown keys**

- [x] **Step 3: Implement**

Caps: use conservative constants in `fields.ts` (`MAX_LEVEL`, etc.) until catalog exists; document numbers.

---

### Task 6: Items model (quality / rolled_modifiers / stats)

**Files:**
- Create: `src/games/eslabong/model/items.ts`
- Modify: `src/games/eslabong/model/fields.ts`
- Test: `tests/eslabong/items.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface ItemStatLine {
  statId: string
  amount: number
  ratio: number
  displayValue?: string
}

export interface ItemRow {
  instanceId: string
  definitionId: string
  quality: string
  exceptionalRoll?: boolean
  rolledModifiers: ResValue
  stats: ItemStatLine[]
  _ref: unknown
}

export function listOwnedItems(doc: ResourceDoc): ItemRow[]
export function applyItem(doc: ResourceDoc, row: ItemRow): void
```

- [x] **Step 1: Map owned instances (not `market_listings`) in `fields.ts`**

- [x] **Step 2: Tests — edit quality + one stat amount; round-trip row**

- [x] **Step 3: Implement; definition swap only among paths already seen in-save**

---

### Task 7: Wire parse / serialize / validate + save gating

**Files:**
- Modify: `src/games/eslabong/parse.ts`
- Modify: `src/games/eslabong/index.ts`
- Create: `src/games/eslabong/actions.ts`
- Test: `tests/eslabong/module-write.spec.ts`

**Interfaces:**
- Replace state shape:

```ts
export interface EslabongState {
  sidecar: Record<string, unknown>
  sidecarPath: string
  resPath: string
  resPlain: ResourceDoc
  club: ClubResources
  fighters: FighterRow[]
  items: ItemRow[]
  writeEnabled: boolean // false until integrity available
  originalResBytes: Uint8Array
  originalSidecarBytes: Uint8Array
}
```

- [x] **Step 1: Failing module test — parse real/fixture → change gold → serialize → integrity present**

- [x] **Step 2: Implement `parse` / `serialize` / `validate`**

`serialize` must: `writeClub` + apply dirty fighters/items → `serializeResourceBinary` → `compressRscc` → `applyIntegrityFields` → emit json + res bytes.

If `computeIntegrity` throws or `writeEnabled === false`, `serialize` throws `ModuleError` with a dedicated code (e.g. `INTEGRITY_UNAVAILABLE`).

- [x] **Step 3: `actions` — `max-progress`, `clear-injuries`**

- [x] **Step 4: Host Save remains disabled when validate/serialize would fail — surface error via existing editor path**

---

### Task 8: Catalog from save + UI tabs

**Files:**
- Create: `src/games/eslabong/catalog/fromSave.ts`
- Modify: `src/games/eslabong/views/OverviewTab.vue`
- Create: `src/games/eslabong/views/FightersTab.vue`
- Create: `src/games/eslabong/views/ItemsTab.vue`
- Modify: `src/games/eslabong/views/index.ts`, `inject.ts`
- Modify: `src/host/i18n/zh.ts`, `en.ts`
- Test: `tests/eslabong/views.spec.ts` (source contract like other games: `editor.rev`, bindings)

**Interfaces:**
- `collectCatalog(doc: ResourceDoc): { skills: string[]; definitions: string[]; qualities: string[]; statIds: string[] }`

- [x] **Step 1: Overview — number inputs for gold / renown / developmentStars; read-only team meta; alert if `!writeEnabled`**

- [x] **Step 2: FightersTab — list + detail form for whitelist fields + skill selects + clear injury / max buttons**

- [x] **Step 3: ItemsTab — list + quality + stats table editors**

- [x] **Step 4: i18n `es.tabs.*` / `es.overview.*` / `es.fighters.*` / `es.items.*`**

- [x] **Step 5: Update `editor-reactivity.spec.ts` inject/tab lists if required**

---

### Task 9: Docs + README status + full verify

**Files:**
- Modify: `docs/games/eslabong.md`, `eslabong.en.md`
- Modify: `README.md`, `README.en.md` (status: 已支持编辑 / Editable)
- Modify: `docs/design/2026-09-21-eslabong-full-design.md` status → 已实现（when done）

- [x] **Step 1: Document editable fields, path, quit-game warning, EA risk, integrity note**

- [x] **Step 2: Run**

```bash
npx vitest run tests/eslabong tests/editor-reactivity.spec.ts
npm run typecheck
```

Expected: all pass (integrity/real-save suites skip without env).

- [ ] **Step 3: Hand-test checklist (must tick before claiming done)**

1. Change gold + renown + development_stars → load in game  
2. Change one fighter level + one skill + clear injury → load  
3. Change one item quality / rolled stat → load  
4. Confirm Challenge Tower fields untouched if present  

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| RSCC write path | 1 |
| integrity | 2, 7 |
| Resource passthrough codec | 3 |
| Global gold/renown/stars | 4, 7, 8 |
| Fighters growth/personality/skills/injury | 5, 8 |
| Item roll quality/stats | 6, 8 |
| No add/delete; PVP ignore | 5–6 constraints |
| Save disabled until integrity | 7–8 |
| Docs / verify | 9 |

## Placeholder scan

None intentional beyond env-gated vectors (explicit `skip`, not fake green).

---

## Execution handoff

Plan saved to `docs/design/2026-09-21-eslabong-full-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach?
