# Chaos Galaxy 2 Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `chaos-galaxy-2` GameModule that round-trips Easy Save 3 binary `.cg2` saves, edits campaign + config collection fields with extracted caps, and registers in the SaveSmith library.

**Architecture:** New isolated module under `src/games/chaos-galaxy-2/`. Binary ES3 is parsed into an ordered entry list (known types decoded; unknown preserved as raw). Flat keys project into resources / planets / commanders / fleets / unlocks; `config.cg2` bitmasks drive the collection tab. AssetRipper + TextAsset XML extraction mirrors Chaos Front. Host I/O unchanged.

**Tech Stack:** Vue 3, Element Plus, Vitest, TypeScript, existing Tauri host; Node `fs` only in extract scripts and env-gated e2e tests.

**Spec:** `docs/design/2026-09-16-chaos-galaxy-2-design.md`

## Global Constraints

- Module never touches `fs` or Tauri `invoke`
- Do not reuse Chaos Front JSON `es3.ts` for CG2 bytes
- Unknown ES3 entries must opaque-passthrough (ordered round-trip)
- Commanders: edit values only (no add/delete entities)
- Fleet/unit add-delete is **out of phase-1 exit criteria**; only edit existing `Fleet{i}*` fields
- Caps come from extracted `game-data.json` (temp constants allowed only if marked `TODO_REPLACE_FROM_EXTRACT` and replaced in Task 5)
- Do not commit real player saves; e2e gated by env vars
- Do not edit pure settings keys in `config.cg2` (volume, resolution, language) — collection bitmasks only
- Prefix i18n keys with `cg2.`

## File map

| Path | Responsibility |
|------|----------------|
| `src/games/chaos-galaxy-2/model/es3-binary.ts` | Ordered binary ES3 parse/serialize |
| `src/games/chaos-galaxy-2/model/types.ts` | `ChaosGalaxy2State`, entity row types |
| `src/games/chaos-galaxy-2/model/saveModel.ts` | Flat keys ↔ campaign projection |
| `src/games/chaos-galaxy-2/model/configModel.ts` | Collection bitmasks |
| `src/games/chaos-galaxy-2/model/gameData.ts` | Load catalog + caps |
| `src/games/chaos-galaxy-2/model/caps.ts` | Clamp helpers |
| `src/games/chaos-galaxy-2/data/game-data.json` | Extracted catalog (minimal stub first) |
| `src/games/chaos-galaxy-2/assets/game/` | Icons from extract |
| `src/games/chaos-galaxy-2/parse.ts` | parse / serialize / validate |
| `src/games/chaos-galaxy-2/locate.ts` | Default save path |
| `src/games/chaos-galaxy-2/slots.ts` | Slot list + sessionFiles |
| `src/games/chaos-galaxy-2/actions.ts` | fill-resources / max-commanders / unlock / max-collection |
| `src/games/chaos-galaxy-2/i18n.ts` | In-tab strings |
| `src/games/chaos-galaxy-2/views/*` | Tabs + inject |
| `src/games/chaos-galaxy-2/index.ts` | `GameModule` export |
| `src/games/chaos-galaxy-2/cover.jpg` | Library cover |
| `src/host/registry.ts` | Register module |
| `src/host/i18n/zh.ts` / `en.ts` | `cg2.tabs` / `cg2.actions` |
| `scripts/extract-chaos-galaxy-2.mjs` | TextAsset + AssetRipper extract |
| `tests/chaos-galaxy-2/*.spec.ts` | Unit + optional e2e |
| `docs/games/chaos-galaxy-2.md` / `.en.md` | User docs |
| `README.md` / `README.en.md` / `CHANGELOG*.md` | Listing |

## Binary format notes (from real `savedata1.cg2` / `config.cg2`)

```
entry := 0x7E  u8(keyLen)  keyUtf8  i32(settings)  [0x51]?  0xFF  u32hashBytes  payload  0x7B
```

Type hashes (byte order as on disk after `FF`):

| Kind | Hash bytes | Payload |
|------|------------|---------|
| int32 | `56 08 A8 E2` | 4 bytes LE |
| bool | `9C 7C 4D AD` | 1 byte `00`/`01` |
| string | `EE F1 E9 FD` | `u8 len` + UTF-8 (observed) |
| float | `6B D7 3E 6E` | 4 bytes LE float |

When `0x51` (`Q`) appears after `settings`, treat as **array**: `FF` + elementHash + `i32 count` + `count` elements + `7B`.

Observed collection counts in config: CommanderCollections ≈ 256 bools; UnitCollections ≈ 512; EventCollections ≈ 128.

`settings` must be preserved per key on rewrite (do not invent). Entries with `0x53` or unrecognized hashes → `kind: 'raw'` storing bytes from `settings` through byte before `0x7B` (or full entry raw) so round-trip succeeds.

---

### Task 1: Binary ES3 codec + synthetic round-trip

**Files:**
- Create: `src/games/chaos-galaxy-2/model/es3-binary.ts`
- Test: `tests/chaos-galaxy-2/es3-binary.spec.ts`

**Interfaces:**
- Produces:

```ts
export type Es3TypeHash = 'int' | 'bool' | 'string' | 'float' | 'int[]' | 'bool[]' | 'raw'

export interface Es3BinaryEntry {
  key: string
  settings: number
  /** Decoded when kind !== 'raw' */
  kind: Es3TypeHash
  value?: number | boolean | string | number[] | boolean[]
  /** Present when kind === 'raw': payload after settings (includes optional 0x51… through pre-0x7B) */
  rawPayload?: Uint8Array
}

export function parseEs3Binary(bytes: Uint8Array): Es3BinaryEntry[]
export function serializeEs3Binary(entries: Es3BinaryEntry[]): Uint8Array
export function getEntry(entries: Es3BinaryEntry[], key: string): Es3BinaryEntry | undefined
export function setScalar(entries: Es3BinaryEntry[], key: string, value: number | boolean | string): void
export function setArray(entries: Es3BinaryEntry[], key: string, value: number[] | boolean[]): void
```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  parseEs3Binary,
  serializeEs3Binary,
  setScalar,
  setArray
} from '../../src/games/chaos-galaxy-2/model/es3-binary'

/** Build minimal file: RealYear=2026 int, IsBeginning=false bool, Name="CN" string */
function fixtureMinimal(): Uint8Array {
  // Prefer constructing via serialize once implemented; for failing test, hand-craft hex from design notes:
  // RealYear: 7E 08 ... RealYear 0A000000 FF 5608A8E2 EA070000 7B
  // IsBeginning: 7E 0B ... 07000000 FF 9C7C4DAD 00 7B
  // LangeuageSet-like: 7E 04 4E 61 6D 65 09000000 FF EEF1E9FD 02 43 4E 7B
  const hex = [
    '7E','08','52','65','61','6C','59','65','61','72','0A','00','00','00','FF','56','08','A8','E2','EA','07','00','00','7B',
    '7E','0B','49','73','42','65','67','69','6E','6E','69','6E','67','07','00','00','00','FF','9C','7C','4D','AD','00','7B',
    '7E','04','4E','61','6D','65','09','00','00','00','FF','EE','F1','E9','FD','02','43','4E','7B'
  ]
  return Uint8Array.from(hex.map((h) => parseInt(h, 16)))
}

describe('es3-binary', () => {
  it('parses int/bool/string and round-trips bytes', () => {
    const raw = fixtureMinimal()
    const entries = parseEs3Binary(raw)
    expect(entries.map((e) => e.key)).toEqual(['RealYear', 'IsBeginning', 'Name'])
    expect(entries[0].kind).toBe('int')
    expect(entries[0].value).toBe(2026)
    expect(entries[1].value).toBe(false)
    expect(entries[2].value).toBe('CN')
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('parses bool[] with 0x51 prefix and round-trips', () => {
    // settings=0x010B, 51, FF, boolHash, count=4, 1 0 1 0
    const hex = [
      '7E','04','46','6C','61','67','0B','01','00','00','51','FF','9C','7C','4D','AD',
      '04','00','00','00','01','00','01','00','7B'
    ]
    const raw = Uint8Array.from(hex.map((h) => parseInt(h, 16)))
    const entries = parseEs3Binary(raw)
    expect(entries[0].kind).toBe('bool[]')
    expect(entries[0].value).toEqual([true, false, true, false])
    expect([...serializeEs3Binary(entries)]).toEqual([...raw])
  })

  it('setScalar updates int and keeps settings', () => {
    const entries = parseEs3Binary(fixtureMinimal())
    setScalar(entries, 'RealYear', 2099)
    const again = parseEs3Binary(serializeEs3Binary(entries))
    expect(again[0].value).toBe(2099)
    expect(again[0].settings).toBe(0x0a)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- tests/chaos-galaxy-2/es3-binary.spec.ts`  
Expected: cannot find module / FAIL

- [ ] **Step 3: Implement `es3-binary.ts`**

Walk buffer: require `0x7E`, read key, read `settings` (Int32LE), if next byte `0x51` set arrayMode, require `0xFF`, read 4 hash bytes, branch on hash (+ arrayMode), read payload, require `0x7B`. On unknown hash or `0x53`, capture raw payload from after `settings` to before `0x7B`. `serialize` emits the same layout; for `raw` write `settings` + `rawPayload` + `7B`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/games/chaos-galaxy-2/model/es3-binary.ts tests/chaos-galaxy-2/es3-binary.spec.ts
git commit -m "feat(chaos-galaxy-2): add ordered binary ES3 codec"
```

---

### Task 2: locate, slots, parse shell, registry

**Files:**
- Create: `src/games/chaos-galaxy-2/locate.ts`
- Create: `src/games/chaos-galaxy-2/slots.ts`
- Create: `src/games/chaos-galaxy-2/model/types.ts`
- Create: `src/games/chaos-galaxy-2/parse.ts` (skeleton: parse entries into state stub)
- Create: `src/games/chaos-galaxy-2/index.ts`
- Create: `src/games/chaos-galaxy-2/views/index.ts` (empty array ok until Task 6)
- Create: `src/games/chaos-galaxy-2/cover.jpg` (placeholder still; replace with store art later if needed)
- Modify: `src/host/registry.ts`
- Test: `tests/chaos-galaxy-2/slots.spec.ts`, `tests/chaos-galaxy-2/parse-roundtrip.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface ChaosGalaxy2State {
  slot: number
  /** Ordered campaign entries — source of truth for serialize */
  campaignEntries: Es3BinaryEntry[]
  configEntries: Es3BinaryEntry[] | null
}

export const locate = {
  windowsPathTemplates: [
    '%USERPROFILE%\\AppData\\LocalLow\\ChaosGalaxyStudio\\ChaosGalaxy2'
  ],
  identifyAnyOf: [
    'savedata0.cg2', 'savedata1.cg2', 'savedata2.cg2',
    'savedata3.cg2', 'savedata4.cg2', 'savedata5.cg2',
    'config.cg2'
  ]
}

export function slotFileName(slot: number): string {
  return `savedata${slot}.cg2`
}

/** listSlots: scan slots 0..5; sessionFiles = [savedataN.cg2, 'config.cg2'] when config exists in listing */
```

- `parse(files)`: find `savedata(\\d+)\\.cg2`, parseEs3Binary; optional `config.cg2`
- `serialize(state)`: write campaign path + config if non-null
- `validate(state)`: return `[]` for now (filled in Task 4)

- [ ] **Step 1: Failing slots test**

```ts
it('lists existing savedata1 with config in sessionFiles', () => {
  const listed = {
    root: 'x',
    files: [
      { relativePath: 'savedata1.cg2', bytes: encodeMinimalCampaign() },
      { relativePath: 'config.cg2', bytes: encodeMinimalConfig() }
    ]
  }
  const slots = listSlots(listed)
  const s1 = slots.find((s) => s.id === '1')!
  expect(s1.exists).toBe(true)
  expect(s1.readable).toBe(true)
  expect(s1.sessionFiles).toEqual(['savedata1.cg2', 'config.cg2'])
})
```

Helpers `encodeMinimalCampaign/Config` use `serializeEs3Binary` with a few keys including `PlayerName` string for title subtitle.

- [ ] **Step 2: Implement locate/slots/parse/index; register in registry**

```ts
// registry.ts
import { chaosGalaxy2Module } from '../games/chaos-galaxy-2'
export const modules: GameModule[] = [
  chaosFrontModule,
  chaosGalaxy2Module,
  wanderburgModule,
  terrariaModule,
  dragonSwordModule
]
```

Module catalog:

```ts
id: 'chaos-galaxy-2',
catalog: {
  name: { zh: '混沌银河 2', en: 'Chaos Galaxy 2' },
  cover: coverUrl,
  rightsHolder: 'ChaosGalaxyStudio',
  developer: 'Han Zhiyu',
  publisher: 'ChaosGalaxyStudio',
  steamAppId: 1537910,
  summary: {
    zh: '非官方存档修改器。请先退出游戏再改档。',
    en: 'Unofficial save editor. Quit the game before editing.'
  }
}
```

- [ ] **Step 3: Round-trip test** — parse synthetic slot bytes → serialize → deep equal bytes

- [ ] **Step 4: `npm test -- tests/chaos-galaxy-2` PASS; `npm run typecheck` PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(chaos-galaxy-2): register module with locate/slots/parse shell"
```

---

### Task 3: Campaign saveModel projection (resources, planets, commanders, fleets, unlocks)

**Files:**
- Create: `src/games/chaos-galaxy-2/model/saveModel.ts`
- Modify: `src/games/chaos-galaxy-2/model/types.ts`
- Modify: `src/games/chaos-galaxy-2/parse.ts` — attach projection helpers or keep entries + accessors on SaveData class
- Test: `tests/chaos-galaxy-2/saveModel.spec.ts`

**Interfaces:**
- Produces class or module API:

```ts
export class SaveData {
  constructor(public entries: Es3BinaryEntry[]) {}
  static load(bytes: Uint8Array): SaveData

  getPlayFaction(): number
  getFactionGold(faction: number): number
  setFactionGold(faction: number, v: number): void
  getFactionSupply(faction: number): number
  setFactionSupply(faction: number, v: number): void
  getFactionPrestige(faction: number): number
  setFactionPrestige(faction: number, v: number): void
  getPlayerEconomicsLevel(): number
  setPlayerEconomicsLevel(v: number): void
  getPlayMonth(): number
  setPlayMonth(v: number): void

  listPlanetIds(): number[]
  getPlanet(id: number): PlanetRow
  setPlanetField(id: number, field: PlanetField, v: number | number[]): void

  listCommanderIds(): number[]  // ids that have Commander{id}Exp key
  getCommander(id: number): CommanderRow
  setCommander(id: number, patch: Partial<CommanderRow>): void

  listFleetIds(): number[]
  getFleet(id: number): FleetRow
  setFleetUnit(fleetId: number, slot: 1|2|...|14, unitTuple: number[]): void
  setFleetCommander(fleetId: number, commanderId: number): void

  /** Faction{f}AlienUnlocked or similar bool/int fields discovered as unlockable */
  unlockAllKnown(faction: number): void

  serialize(): Uint8Array
}

export interface CommanderRow {
  id: number
  exp: number
  admin: number
  military: number
  intellect: number
  breeding: number
  star: number
  skills: number[]  // int[] from Commander{N}Skills
}

export interface PlanetRow {
  id: number
  faction: number
  defense: number
  resistance: number
  labourPoint: number
  hqLevel: number
  // include orbital/surface building arrays when keys exist
}

export interface FleetRow {
  id: number
  faction: number
  commander: number
  flagship: number
  status: number | number[] | null
  units: (number[] | null)[]  // length 14; null = missing key
}
```

Key naming helpers: `` `Faction${f}Gold` ``, `` `Planet${i}Defense` ``, `` `Commander${i}Exp` ``, `` `Fleet${i}Unit${u}` ``.

- [ ] **Step 1: Failing tests** building entries via `serializeEs3Binary` / `parseEs3Binary` with Faction0Gold, Commander1Exp, Planet1Defense, Fleet1Unit1 int[4]

- [ ] **Step 2: Implement SaveData accessors using getEntry/setScalar/setArray**

- [ ] **Step 3: Wire parse.ts**

```ts
export interface ChaosGalaxy2State {
  slot: number
  campaign: SaveData
  config: ConfigSnapshot | null  // null until Task 4; for now keep configEntries on state or stub
}
```

Prefer evolving state to `campaign: SaveData` wrapping entries (single SoT). If Task 2 used `campaignEntries`, refactor here in the same commit.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(chaos-galaxy-2): project flat keys into SaveData model"
```

---

### Task 4: config collections + validate + caps stubs + actions

**Files:**
- Create: `src/games/chaos-galaxy-2/model/configModel.ts`
- Create: `src/games/chaos-galaxy-2/model/caps.ts`
- Create: `src/games/chaos-galaxy-2/model/gameData.ts`
- Create: `src/games/chaos-galaxy-2/data/game-data.json` (stub caps)
- Create: `src/games/chaos-galaxy-2/actions.ts`
- Modify: `parse.ts` validate
- Test: `tests/chaos-galaxy-2/configModel.spec.ts`, `tests/chaos-galaxy-2/caps.spec.ts`, `tests/chaos-galaxy-2/actions.spec.ts`

**Interfaces:**

```ts
// game-data.json stub
{
  "commanderMaxExp": 999999,
  "commanderMaxStar": 5,
  "commanderMaxStat": 99,
  "planetMaxDefense": 999,
  "planetMaxHqLevel": 10,
  "resourceMaxGold": 999999999,
  "resourceMaxSupply": 999999999,
  "resourceMaxPrestige": 999999,
  "commanders": [],
  "units": [],
  "levelTables": {}
}

export function clampCommander(row: CommanderRow, gd: GameData): CommanderRow
export function clampFactionResources(...): void

export interface ConfigSnapshot {
  entries: Es3BinaryEntry[]
  getCollection(name: 'CommanderCollections' | 'UnitCollections' | 'EventCollections'): boolean[]
  setCollectionBit(name, index: number, on: boolean): void
  maxAllCollections(): void
}

export function validate(state: ChaosGalaxy2State): ValidationIssue[]
// clamp in validate (mutate) like CF sanitize; return [] unless fatal
```

Actions (mirror CF ids style):

```ts
export const actions = [
  { id: 'fill-resources', labelKey: 'cg2.actions.fillResources', kind: 'button' },
  { id: 'max-commanders', labelKey: 'cg2.actions.maxCommanders', kind: 'button' },
  { id: 'unlock-all', labelKey: 'cg2.actions.unlockAll', kind: 'button' },
  { id: 'max-collection', labelKey: 'cg2.actions.maxCollection', kind: 'button' }
]
```

- [ ] **Step 1: Tests for collection bit flip + clampCommander + applyAction fill-resources**

- [ ] **Step 2: Implement**

- [ ] **Step 3: PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(chaos-galaxy-2): config collections, caps, and actions"
```

---

### Task 5: Extract script + real game-data (names, icons, caps)

**Files:**
- Create: `scripts/extract-chaos-galaxy-2.mjs`
- Modify/replace: `src/games/chaos-galaxy-2/data/game-data.json`
- Create: `src/games/chaos-galaxy-2/assets/game/` (generated)
- Docs snippet in script header

**Approach:** Copy structure from `scripts/extract-game-data.mjs`. Phase 1: scan `ChaosGalaxy2_Data/resources.assets` for TextAsset XML roots (discover tags by searching `<Commander` / `<Unit` / `<Language` / level tables). Phase 2: optional AssetRipper for sprites. Map extracted max exp / star / building levels into JSON fields used by `caps.ts`; **delete TODO stub constants**.

- [ ] **Step 1: Run discover pass**

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('F:/SteamLibrary/steamapps/common/Chaos Galaxy 2/ChaosGalaxy2_Data/resources.assets'); const s=b.toString('latin1'); for (const m of s.matchAll(/<[A-Za-z]+Data>/g)) console.log(m[0])"
```

Record XML root names into the script.

- [ ] **Step 2: Implement extract script; run with `--game "...\ChaosGalaxy2_Data"`**

- [ ] **Step 3: Unit test `gameData.spec.ts` — commanders/units non-empty OR skip if stub CI without assets; assert cap fields are finite positives**

- [ ] **Step 4: Commit generated JSON + script (icons if license-ok derived crops like CF)**

```bash
git commit -m "feat(chaos-galaxy-2): add extract script and game-data catalog"
```

---

### Task 6: Views + host i18n

**Files:**
- Create: `src/games/chaos-galaxy-2/views/inject.ts`
- Create: `src/games/chaos-galaxy-2/views/ResourcesTab.vue`
- Create: `src/games/chaos-galaxy-2/views/PlanetsTab.vue`
- Create: `src/games/chaos-galaxy-2/views/CommandersTab.vue`
- Create: `src/games/chaos-galaxy-2/views/FleetsTab.vue`
- Create: `src/games/chaos-galaxy-2/views/UnlockTab.vue`
- Create: `src/games/chaos-galaxy-2/views/CollectionTab.vue`
- Modify: `src/games/chaos-galaxy-2/views/index.ts`
- Create: `src/games/chaos-galaxy-2/i18n.ts`
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts` — add `cg2.tabs` + `cg2.actions`
- Test: `tests/chaos-galaxy-2/views.spec.ts` (mount contract / labelKeys exist — follow CF `views.spec.ts` pattern)

**Interfaces:**
- `useCg2Editor()` like `useCfEditor`, inject key `'CG2_EDITOR_INJECT'`
- Tabs labelKeys: `cg2.tabs.resources|planets|commanders|fleets|unlock|collection`
- All numeric inputs bind `:min` / `:max` from `caps` / `gameData`
- Tables: snapshot rows + `index`; depend on `rev`; mutate via `markDirty`

- [ ] **Step 1: Add host i18n keys + empty tabs wiring; typecheck**

- [ ] **Step 2: Implement Resources + Commanders tabs first (highest value)**

- [ ] **Step 3: Planets, Fleets, Unlock, Collection**

- [ ] **Step 4: `npm test -- tests/chaos-galaxy-2/views.spec.ts` + `npm run typecheck`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(chaos-galaxy-2): add editor tabs and i18n"
```

---

### Task 7: Docs, README, CHANGELOG, env-gated e2e

**Files:**
- Create: `docs/games/chaos-galaxy-2.md`, `docs/games/chaos-galaxy-2.en.md`
- Modify: `README.md`, `README.en.md` support table
- Modify: `CHANGELOG.md`, `CHANGELOG.en.md` (Unreleased)
- Create: `tests/chaos-galaxy-2/e2e-real-save.spec.ts`
- Modify: design doc status line → 实现中/已有 plan

**E2E gate (never commit real saves):**

```ts
// CG2_SAVE=1
// CG2_E2E_SAVE=path\to\copy\of\savedata1.cg2
// CG2_E2E_CONFIG=path\to\copy\of\config.cg2
```

Tests: parse→serialize byte equality; setFactionGold(+1) still parses; clamp max commander exp ≤ gd.commanderMaxExp.

- [ ] **Step 1: Write docs mirroring `docs/games/chaos-front.md` structure**

- [ ] **Step 2: README row + CHANGELOG Unreleased bullet**

- [ ] **Step 3: E2E file; locally run with env if copies exist; CI without env must skip**

- [ ] **Step 4: Full `npm test` + `npm run typecheck`**

- [ ] **Step 5: Commit**

```bash
git commit -m "docs(chaos-galaxy-2): user docs, changelog, and gated e2e"
```

- [ ] **Step 6: Manual handtest** (from `docs/HANDTEST.md` style): quit game → edit gold → max one commander → light one collection bit → launch game verify

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Register module + locate LocalLow path | 2 |
| Binary ES3 ordered + opaque passthrough | 1 |
| Resources / planets / commanders / fleets / unlock / collection | 3, 4, 6 |
| config.cg2 collections | 4 |
| AssetRipper + names/icons | 5 |
| Level/stat/resource caps | 4, 5 |
| Commanders no add/delete; fleet add/delete deferred | 3, 6 (no UI for add) |
| Host backup/atomic write unchanged | (no host write changes) |
| Docs + verify before done | 7 |

## Placeholder scan

No TBD steps; fleet add/delete explicitly deferred; stub caps replaced in Task 5.

## Type consistency

- `Es3BinaryEntry` / `parseEs3Binary` / `serializeEs3Binary` from Task 1 used everywhere
- State settles on `campaign: SaveData` + `config: ConfigSnapshot | null` from Task 3–4
- i18n prefix `cg2.` throughout
