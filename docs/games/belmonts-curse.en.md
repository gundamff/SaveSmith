# Castlevania: Belmont's Curse

[中文](belmonts-curse.md) | **English**

Unofficial save-editing notes. Rights holder: **KONAMI** (Steam AppID [4231820](https://store.steampowered.com/app/4231820/)). Not affiliated with the publisher. Module cover uses the Steam store header (© KONAMI).

> **Phase 1:** Edits only the **character scalar whitelist** under `playerSave` in slot files `BuildSave_*.sav`. Inventory, Abilities / Arcana, and Exploration are **read-only**. Does **not** read or write `PLAYERPREFS.sav` (settings / DLC flags).

Design: [2026-10-19](../design/2026-10-19-belmonts-curse-design.md)

## Save location

Default (Windows):

`%USERPROFILE%\AppData\LocalLow\KONAMI\Castlevania Belmont's Curse`

Slot files: `BuildSave_0.sav`, `BuildSave_1.sav`, … (typically ~4 slots). SaveSmith **lists and edits only** `BuildSave_*.sav`.

The same folder may contain `PLAYERPREFS.sav` (preferences / DLC-related keys) and `steam_autocloud.vdf`. **This module does not treat them as editable slots and never writes them.**

## Format

- Single-line UTF-8 **JSON**; common top-level keys include `version`, `playerSave`, `worldSaves`, `progressionBoardSave`.
- **No** checksum / HMAC. Unknown keys are **passed through**; only whitelist scalars change.
- `JSON.stringify` on save may alter whitespace or key order vs. the original file. Success means **the game loads the file** (see [HANDTEST](../HANDTEST.md)).

Steam Cloud syncs `*.sav` in this folder (~40 MiB quota). **Quit the game completely** before editing, and consider **disabling Steam Cloud** for this title so an older cloud copy does not overwrite your edits.

## Editable content (SaveSmith today)

| Tab | Mode | Content |
|-----|------|---------|
| Overview | Read-only summary | `version`, `saveDate`, `playTimeInSeconds`, etc. |
| Character | **Writable** | Whitelist below |
| Inventory | Read-only | `itemsInInventory`, equip slots; localized names when catalog exists, else raw IDs |
| Abilities / Arcana | Read-only | `vaniaMoves`, `progressionPersistentSave`, Arcana list summaries |
| Exploration | Read-only | World entry counts, `currentCompletionItemCount`, entity state counts (no per-entity editing) |

### Character scalar whitelist (`playerSave`)

| Field | Constraint |
|-------|------------|
| `level` | integer ≥ 1 |
| `experienceCurrent` | integer ≥ 0 |
| `healthUpgradeFragmentCount` | integer ≥ 0 |
| `manaUpgradeFragmentCount` | integer ≥ 0 |
| `atkBonusUpgradeCount` | integer ≥ 0 |
| `defBonusUpgradeCount` | integer ≥ 0 |
| `currentTheHermitDeathDefianceCount` | integer ≥ 0 |

These are shown but **not editable** (edits would not stick): `currentHealth`, `currentMana`, `currentHealChargesCount`.  
Reason: continuing from a **Mirror of Life** restores full HP/MP and refill heal charges, so runtime vitals in the save are overwritten on a normal load. Level / XP / upgrade fragments are persistent, so they stick. To raise HP/MP **caps**, edit the upgrade fragment fields—not current values.

Everything else (including `worldSaves`, `progressionBoardSave`, equip IDs) is **passed through unchanged**. Phase 1 **cannot** add inventory items or abilities in the UI (phase 2 needs item↔world mapping and hand-test gates).

Automatic backups (last 10 per file) before save; restore from the backup panel.

## Usage notes

1. **Fully quit the game** before editing (quit may rewrite `BuildSave_*.sav`).
2. Consider **turning off Steam Cloud** for this game until you verify edits stick.
3. Use a **copy** of your save for first trials—not your only live slot.
4. For legitimate owners, **offline single-player** study only; do not use online or distribute modified saves.
5. After major game updates, JSON shape or `version` may drift; see the module and [CHANGELOG](../../CHANGELOG.en.md).

## Developers

- Module: `src/games/belmonts-curse/`
- Tests: `npx vitest run tests/belmonts-curse`

Back to [README](../../README.en.md).
