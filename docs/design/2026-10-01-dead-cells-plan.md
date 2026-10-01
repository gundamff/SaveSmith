# Dead Cells Module Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `dead-cells` GameModule that round-trips the DEADCE11 container (header + zlib + chunked payload), decodes/encodes hxbit (HXS) chunks, edits S_User meta-progression (resources / blueprint unlocks / stats), and registers in the SaveSmith library.

**Architecture:** New isolated module under `src/games/dead-cells/`. Three-layer codec: `container.ts` (59-byte header, chunk framing, SHA-1 recompute) → `hxbit.ts` (generic self-describing HXS codec with schema-driven object graph) → `userModel.ts` (typed S_User projection). Unknown fields pass through by schema; S_Game / S_UserAndGameData are byte-passthrough. Host I/O unchanged.

**Tech Stack:** Vue 3, Element Plus, Vitest, TypeScript, existing Tauri host. zlib via native `DecompressionStream`/`CompressionStream` (no new deps). Node `fs` only in env-gated e2e tests.

**Spec:** `docs/design/2026-10-01-dead-cells-design.md`

## Global Constraints

- Module never touches `fs` or Tauri `invoke`
- S_Game / S_UserAndGameData chunks: byte-passthrough only (never decoded/edited)
- Unknown hxbit fields/classes: schema-driven passthrough; never regenerate object graph topology (preserve UID refs)
- On write: preserve original `githash` / `builddate` / feature flags (bits 4/5/6); rebuild chunk flags from present chunks; recompute SHA-1 (zeroed-region method)
- Do not commit real player saves; e2e gated by `DC_SAVE` env var
- Do not edit `dc_options.json`
- Prefix i18n keys with `dc.`
- zlib round-trip: decompressed payload must be byte-identical when unedited (compressed bytes may differ)

## File map

| Path | Responsibility |
|------|----------------|
| `src/games/dead-cells/model/container.ts` | Header parse/build, chunk split/join, SHA-1 recompute, zlib streams |
| `src/games/dead-cells/model/hxbit.ts` | Generic HXS codec: VarInt/String/PropType/refs/schema |
| `src/games/dead-cells/model/userModel.ts` | S_User projection: resources / ItemProgress / UserStats / skins / BossRush |
| `src/games/dead-cells/parse.ts` | parse / serialize / validate |
| `src/games/dead-cells/locate.ts` | Save path templates + identify |
| `src/games/dead-cells/slots.ts` | Slot list (`user_*.dat`) + sessionFiles |
| `src/games/dead-cells/views/ResourcesTab.vue` | Gold / cells editor |
| `src/games/dead-cells/views/BlueprintsTab.vue` | ItemProgress unlock editor |
| `src/games/dead-cells/views/StatsTab.vue` | UserStats readout + skin/BossRush toggles |
| `src/games/dead-cells/views/index.ts` / `inject.ts` | ViewSpec[] + session bindings |
| `src/games/dead-cells/index.ts` | `GameModule` export |
| `src/games/dead-cells/cover.jpg` | Library cover (Steam header 460×215) |
| `src/host/registry.ts` | Register module |
| `src/host/i18n/zh.ts` / `en.ts` | `dc.tabs.*` etc. |
| `tests/dead-cells/*.spec.ts` | container / hxbit / userModel / module / parse round-trip + gated e2e |
| `tests/host-library.spec.ts` + 3 game module specs | Registry assertions 6→7 |
| `docs/games/dead-cells.md` / `.en.md` | User docs |
| `README.md` / `README.en.md` / `CHANGELOG*.md` / `docs/HANDTEST.md` | Listing + manual QA |

## Format notes (verified against real `user_0.dat`)

Container header (59 bytes): `DE AD CE 11` magic, u8 version=1, 20B SHA-1 (zeroed-region method, verified match), 20B githash, 10B build date `YYYY-MM-DD`, u32 LE flags.

Flags: bit0 S_User (hxbit), bit1 S_Game (hxbit), bit2 S_UserAndGameData (hxbit), bit3 S_Date (f64 LE), bits4-6 feature-only (no chunk), bit7 S_VersionNumber (f32 LE), bit8 S_DLCMask (u32 LE). Chunks appear in ascending bit order: `[u32 LE size][contents]`.

HXS layout: `[len+1]["HXS"][u8 ver]` then per class `[len+1][name][u16 BE clid][u32 LE crc]`, terminated by null string; then u32 LE schema size + schema data; then object data. Strings: VarInt(len+1) + UTF-8 (0 = null). VarInt: <0x80 single byte, else 0x80 + i32 LE. Object ref: VarInt UID (0 = null; repeated UID = back-ref). Schema entries carry field names + PropType encodings (self-describing).

Observed S_User classes: `User` (fields incl. flags, userId, deathMoney, deathCells, heroSkin, heroHeadSkin, itemMeta, userStats, meta, metaItems, npcs, achievements, deathItem, consecutiveCompletedRuns…), `MonsterStat`, `BiomeStat`, `UserStats`, `tool.ItemProgress`, `tool.ItemMetaManager`, `tool.SpeedrunData`, `tool.StoryManager`, `tool.Tutorial`, `tool.bossRush.BossRushData`.

Reference implementations: `N3rdL0rd/alivecells` (MIT) `savetool.py` + `hxbit/core.py`; `Juanipis/deadcells-save-sync` (MIT) `docs/SAVE_FORMAT.md`; ModDocCE.

---

### Task 1: Container codec + round-trip test

**Files:**
- Create: `src/games/dead-cells/model/container.ts`
- Test: `tests/dead-cells/container.spec.ts`

- [ ] Implement header parse (magic/version/sha1/githash/builddate/flags) with SHA-1 verify (zeroed-region)
- [ ] Implement chunk split (ascending bit order, size-prefixed) / join
- [ ] Implement build(): preserve githash/builddate/feature flags, recompute chunk flags + SHA-1
- [ ] zlib via `DecompressionStream`/`CompressionStream('deflate')` (async)
- [ ] Test: synthetic save round-trip (payload byte-identical after decompress; checksum valid after rebuild)
- [ ] Test: corrupt checksum → error; wrong magic → error

### Task 2: hxbit (HXS) codec + round-trip test

**Files:**
- Create: `src/games/dead-cells/model/hxbit.ts`
- Test: `tests/dead-cells/hxbit.spec.ts`

- [ ] Reader: VarInt/String/class table/schema section/object graph (UID refs)
- [ ] PropType decode: primitives, Array, Obj, Map, Enum, Serializable ref, Null wrapper, Bytes, Dynamic, Vector
- [ ] Writer: re-encode from decoded tree preserving unknowns; byte-identical round-trip on synthetic schema+objects
- [ ] Test: encode→decode→encode idempotence; back-reference graph preserved

### Task 3: userModel projection + parse/serialize

**Files:**
- Create: `src/games/dead-cells/model/userModel.ts`, `src/games/dead-cells/parse.ts`
- Test: `tests/dead-cells/userModel.spec.ts`, `tests/dead-cells/parse.spec.ts`

- [ ] Project S_User → `DeadCellsState` (resources, items[], stats, skins, bossRush)
- [ ] Mutators write back into hxbit tree; untouched subtrees byte-passthrough
- [ ] serialize: rebuild container (Task 1) with unchanged S_Game/S_UserAndGameData chunks
- [ ] validate: non-negative clamps; structural guards
- [ ] Test: synthetic full-container round-trip; edit gold/cells → reparse correct; unedited payload byte-identical

### Task 4: Module contract + registry

**Files:**
- Create: `src/games/dead-cells/locate.ts`, `slots.ts`, `index.ts`
- Edit: `src/host/registry.ts`
- Test: `tests/dead-cells/module.spec.ts`, `tests/host-library.spec.ts`, `tests/chaos-front/module.spec.ts`, `tests/terraria/module.spec.ts`, `tests/wanderburg/module.spec.ts`

- [ ] locate: path templates (Steam userdata remote + `<game>\save`), identify `user_0.dat`; slotFilePatterns `user_*.dat`
- [ ] listSlots: one slot per `user_N.dat`
- [ ] index.ts: catalog (zh/en name, AppID 588650, rightsHolder, summary)
- [ ] Register; update registry assertions (6→7)
- [ ] Test: module contract (id/catalog/locate/views membership)

### Task 5: Views + i18n + cover

**Files:**
- Create: `src/games/dead-cells/views/*`, `cover.jpg`
- Edit: `src/host/i18n/zh.ts`, `en.ts`

- [ ] ResourcesTab: gold/cells numeric editors
- [ ] BlueprintsTab: ItemProgress table (unlocked toggle, investedCells)
- [ ] StatsTab: UserStats readout + skin/BossRush toggles
- [ ] `dc.tabs.*` i18n keys (zh + en); views/index.ts ViewSpecs; inject.ts via `useSessionBindings`
- [ ] cover.jpg: Steam header image (460×215)

### Task 6: Docs + changelog + handtest

**Files:**
- Create: `docs/games/dead-cells.md`, `docs/games/dead-cells.en.md`
- Edit: `README.md`, `README.en.md`, `CHANGELOG.md`, `CHANGELOG.en.md`, `docs/HANDTEST.md`

- [ ] Per-game docs: save locations (Steam Cloud vs local), editable fields, caveats (quit game first), unofficial disclaimer
- [ ] README table row ×2; CHANGELOG entries ×2; HANDTEST items

### Task 7: Full verification

- [ ] `npm test` all green
- [ ] `npm run typecheck` clean
- [ ] Real-save round-trip via `DC_SAVE` env (read-only verify checksum + unedited payload identity; restore from backup after any write test)
- [ ] Registry id list assertions consistent
