# PBZ Equipment Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add main-weapon, phantom-weapon, and accessory add/level/delete editing to Phantom Blade Zero with explicit corrupt-save / backup warnings.

**Architecture:** Static `catalog/equipment.json` + `model/equipment.ts` for Inventory unique-item maps; ResourcesTab gains three tabs; reuse slot dirty/serialize path (Oodle stored). Field layout aligned to PBZ-Editor public semantics, rewritten in SaveSmith TS style.

**Tech Stack:** TypeScript, Vue 3, Vitest, existing PBZ module patterns.

## Global Constraints

- Module id `phantom-blade-zero`; no `fs` / Tauri in module.
- Categories: `main-weapon` | `phantom-weapon` | `accessory` only this plan.
- Level maps: WeaponLevel/ShaChiWeaponLevel = UI+1; CurrentLevel = UI.
- Refuse delete when main/phantom equipped; clear AccessoryIDs to `"None"` before accessory delete.
- UI must warn: may corrupt save; backup first; not per-item verified.
- Do not copy PBZ-Editor source; MIT field reference only.
- Filter experimental/test/placeholder rows from catalog.
- Default weapon/phantom `maxLevel` when table lacks one: `20` (retain higher from real saves for edit-down only).

## File map

| File | Role |
|------|------|
| `catalog/equipment.json` | Static gear rows |
| `catalog/equipment.ts` / extend `catalog/index.ts` | Types, lookup, search, names |
| `catalog/SOURCE.md` | Provenance for equipment tables |
| `scripts/pbz-build-equipment-catalog.mts` | Build from local DT exports |
| `model/equipment.ts` | project / add / setLevel / remove / validate |
| `model/saveModel.ts` | Wire validate + exports |
| `views/EquipmentCategoryTab.vue` + dialog | Level UI |
| `views/ResourcesTab.vue` | Tabs + risk alert |
| i18n / game docs / todo / CHANGELOG / tests | Copy + coverage |

---

### Task 1: Equipment catalog types + JSON seed

**Files:**
- Create: `src/games/phantom-blade-zero/catalog/equipment.json`
- Create: `src/games/phantom-blade-zero/catalog/equipmentCatalog.ts` (or extend `index.ts`)
- Test: `tests/phantom-blade-zero/equipment-catalog.spec.ts`
- Modify: `catalog/SOURCE.md`

**Produces:** `PbzEquipmentCategory`, `PbzEquipmentItem`, `getPbzEquipment`, `searchPbzEquipment`, `pbzEquipmentName`, `DEFAULT_WEAPON_MAX_LEVEL=20`

- [ ] **Step 1:** Failing test — catalog loads ≥1 row per category; search filters; experimental ids absent.
- [ ] **Step 2:** Generate `equipment.json` from local game DT exports (build `26266538`); filter experimental heuristics.
- [ ] **Step 3:** Implement catalog module; update SOURCE.md; tests pass.
- [ ] **Step 4:** Commit.

### Task 2: `model/equipment.ts` core

**Files:**
- Create: `src/games/phantom-blade-zero/model/equipment.ts`
- Test: `tests/phantom-blade-zero/equipment.spec.ts`
- Modify: `model/saveModel.ts` (validate aggregation)

**Produces:**
- `projectEquipment(slot, category)`
- `addEquipment(model, slotName, id, level?, now?)`
- `setEquipmentLevel(model, slotName, id, uiLevel)`
- `removeEquipment(model, slotName, id)` → throws `ModuleError` if equipped weapon/phantom
- `validateEquipment(model)` issues

- [ ] **Step 1:** Failing tests for level codec, add defaults, refuse equipped delete, accessory AccessoryIDs → `"None"`.
- [ ] **Step 2:** Implement equipment.ts; wire validate.
- [ ] **Step 3:** Tests pass; commit.

### Task 3: UI tabs + risk copy

**Files:**
- Create: `views/EquipmentCategoryTab.vue`, `views/AddEquipmentDialog.vue` (or shared)
- Modify: `views/ResourcesTab.vue`, `host/i18n/zh.ts`, `host/i18n/en.ts`
- Test: extend `tests/phantom-blade-zero/views.spec.ts`

- [ ] **Step 1:** Failing view test — three tab names registered; risk string present.
- [ ] **Step 2:** Implement tabs (level editor, add, delete confirm); error/warning alert.
- [ ] **Step 3:** Tests pass; commit.

### Task 4: Docs + todo + CHANGELOG + module chain

**Files:**
- Modify: `docs/games/phantom-blade-zero.md`, `.en.md`, `docs/todo.md`, `CHANGELOG.md`, `CHANGELOG.en.md`, `docs/HANDTEST.md`
- Test: `tests/phantom-blade-zero/module.spec.ts` (optional one dirty equipment round-trip if fixture allows)

- [ ] **Step 1:** Update docs/i18n-adjacent docs; mark todo items done for these three.
- [ ] **Step 2:** Run `npx vitest run tests/phantom-blade-zero --exclude '**/_*'`.
- [ ] **Step 3:** Commit.

---

## Execution note

Prefer implementing Task 1 catalog generation against `F:\SteamLibrary\steamapps\common\PBZ` using existing TEMP unpack tools; if full DT JSON dump is slow, parse the three UI DataTable uassets with a dedicated script and zh-Hans localization already used for items.
