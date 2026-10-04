# Changelog

[中文](CHANGELOG.md) | **English**

## [0.14.1] - 2026-10-04

Fix incomplete ACE COMBAT 8 post-clear unlocks: sync hangar situations and aircraft-tree nodes, and warn against moving the mission cursor to the finale.

### Fixed

- **ACE COMBAT 8**: “Enable post-clear unlocks / Pseudo NG+” now writes the full clear `FeatureFlagMask` (`0x3EFC`, including Aircraft Tree), syncs Free Mission and hangar situation IDs 1–31, and merges cleared-save aircraft-tree nodes; previously only the flag delta and Free Missions were updated, so in-game menus could still look locked
- **ACE COMBAT 8**: Progress tab warns not to set last completed/played mission IDs to 30/31 (finale soft-lock); use Pseudo NG+ to reset the cursor to 0

## [0.14.0] - 2026-10-02

Adds ACE COMBAT 8: WINGS OF THEVE campaign editing (MRP, post-clear unlocks, pseudo NG+).

### Added

- **ACE COMBAT 8**: edit current / total MRP in `Campaign.sav`
- **ACE COMBAT 8**: Progress / Playthrough — enable post-clear privileges (FeatureFlag + CompletionCount + all Free Missions), or pseudo NG+ (reset mission cursor, keep hangar/MRP, keep clear privileges)
- Recomputes `Checksum` on write (`CRC32(PackedData, seed 0x41916EBD)`) so the game does not report a corrupted save

### Fixed

- **Host**: save-path probing now includes `%LOCALAPPDATA%` (needed by ACE COMBAT 8 and similar titles)

## [0.13.0] - 2026-10-02

Dead Cells gains an Unlock tab (all unlockables); fixes save detection when Steam is not on D:.

### Added

- **Dead Cells**: the Unlock tab replaces the Skins tab and covers all **472 unlockable items** — weapons & skills 201, mutations 57, aspects 13, skins 149, heads 43, permanent upgrades 22 — with search, category filter and per-item or batch unlock/lock
- Items missing from the save are appended to `itemProgress` (reusing the object-append support)

### Fixed

- **Save path detection**: path templates now support `*` wildcard segments (for Steam `userdata\<account id>`) and walk the common Steam roots (C: default plus `Steam` / `SteamLibrary` on D/E/F), fixing save detection when **Steam is not installed on D:**; templates whose env vars are unavailable are skipped instead of producing junk paths

## [0.12.0] - 2026-10-01

Dead Cells gains a Boss Stem Cell (difficulty) selector.

### Added

- **Dead Cells**: Resources tab now offers a "Boss Stem Cells (difficulty)" dropdown (0–5: Normal / Hard / Very Hard / Expert / Nightmare / Hell); writes `bossRuneActivated` and syncs `BossRune1..N` into the permanent item lists

### Notes

- The Boss Stem Cell field semantics (count vs. bitmask) are not yet verified in-game; if the difficulty does not change, please share a save copy

## [0.11.0] - 2026-10-01

Dead Cells gains a Skins tab that can unlock every outfit and head.

### Added

- **Dead Cells**: Skins tab — all 149 outfits + 43 heads shipped with the game, with search, type filter, per-skin unlock/lock and batch actions on the current list
- **Dead Cells**: skins missing from the save get a **new `itemProgress` entry** — the codec now supports appending entries to object arrays (previously string arrays only)

## [0.10.1] - 2026-10-01

Dead Cells: skins become dropdowns; Boss Rush unlock fields get localized names.

### Changed

- **Dead Cells**: skin / head skin switched from text input to a searchable **dropdown** covering all 149 outfits and 43 heads shipped with the game (localized names)
- **Dead Cells**: Boss Rush unlock fields now show localized names (Game mode, Base, Cloak, Pants, Belt, Helmet, Armor, Weapon, Material) with the raw field name as a subtitle
- `scripts/extract-dead-cells-names.mjs` also emits `data/skins.json`

## [0.10.0] - 2026-10-01

Dead Cells gains a rune editor; the read-only stats table is dropped and skins / Boss Rush move into Resources.

### Added

- **Dead Cells**: Runes tab — unlock / clear permanent runes (Vine, Teleport, Ram, Spider, Homunculus, Customization, Challenger, Explorer, Traveler, Richter), names from the game localization; one-click unlock all
- **Dead Cells**: hxbit codec now supports adding/removing string-array entries (previously in-place value edits only)

### Changed

- **Dead Cells**: removed the read-only lifetime stats table; skins and Boss Rush toggles moved into the Resources tab

### Notes

- **Dead Cells**: the rune storage slot is not yet community-verified; the tool writes to both `permanentItems` and `metaItems`. If it does not take effect in-game, please share a save copy.

## [0.9.1] - 2026-10-01

Dead Cells blueprint entries now show Chinese display names; fixes a save-blocking negative-sentinel bug.

### Fixed

- **Dead Cells**: `itemProgress.investedCells` can be a negative sentinel (e.g. `-2`) in real saves, which the save validator wrongly rejected (blocking save). Only Gold/Cells are range-checked now.
- **Dead Cells**: blueprint entries show the game’s official localized names (e.g. 圆斩箭塔 / 均衡之刃), extracted from the installed game by `scripts/extract-dead-cells-names.mjs`; unknown ids fall back to the raw identifier.

## [0.9.0] - 2026-10-01

Adds **Dead Cells** meta-progression editing.

### Added

- **Dead Cells** (Motion Twin / Evil Empire, Steam AppID 588650): PC user_N.dat container (59-byte header + zlib + hxbit) codec; resources (gold/cells), blueprint unlocks (itemProgress), statistics (read-only UserStats + skins / Boss Rush unlocks)
- Generic hxbit (HXS) codec layer: self-describing schema parsing, untouched bytes written back verbatim, SHA-1 checksum recomputed on save
- Real-save smoke test gated by the DC_SAVE env var

### Notes

- Quit the game completely before editing (Steam Cloud upload on exit would overwrite changes)

## [0.8.0] - 2026-09-24

Chaos Front can recruit defeated-faction pilots; clarifies Chaos Galaxy 2 commander faction usage.

### Added

- **Chaos Front**: Pilots tab “Add” — only leaders / spymasters / commanders from defeated factions; removing them from that faction roster on add to avoid duplicate-ID crashes; mission-unlock pilots unsupported

### Docs

- **Chaos Galaxy 2**: Document that commanders have no standalone owner field; use the Fleets tab to assign them for “My faction” (in-app hint updated)

## [0.7.0] - 2026-09-22

Adds **Eslabong** full save editing (pure TypeScript write-back).

### Added

- **Eslabong** (shirowita, Steam AppID 4560660): Godot RSCC `.res` + sidecar `.json`; overview (gold/renown/codex), fighters, items
- Save recomputes sidecar `integrity` and keeps `gold` in sync with `.res` `player_gold`
- Fighters tab can edit equipped relic rolled stats in place; Chinese labels (class/skills/relics/stats)
- Static hard bounds for editable scalars (input min/max + save validation)

### Infrastructure / Docs

- Game notes in `docs/games/eslabong.en.md`; cover from Steam store header (© shirowita)
- Module tests under `tests/eslabong/`; real-save smoke gated by local AppData paths

## [0.6.0] - 2026-09-17

Adds **Chaos Galaxy 2**; hardens fleet / commander editing UX.

### Added

- **Chaos Galaxy 2** (ChaosGalaxyStudio, Steam AppID 1537910): binary ES3 slots `savedataN.cg2` plus `config.cg2` collections; resources, planets, commanders, fleets, unlocks, collection
- Faction / skill-chip selects show names (with `#id`); unlock flag “Alien content unlock” includes an explanation
- Commanders: default to my faction, name/ID search, faction column; max-my-faction button
- Fleets: card layout (meta + unit-slot grid); default to my faction; loading state when switching to all factions
- Host tab-switch busy overlay held an extra frame to reduce freeze when mounting heavy panels

### Infrastructure / Docs

- Game notes and screenshots in `docs/games/chaos-galaxy-2.en.md`; extract via `scripts/extract-chaos-galaxy-2.mjs`
- Real-save e2e gated by `CG2_SAVE` / `CG2_E2E_SAVE` / `CG2_E2E_CONFIG`; player saves are never committed

## [0.5.1] - 2026-09-14

Chaos Front Resources tab can edit the Committee calendar (in-game date).

### Added

- Chaos Front: edit Committee calendar year / month / day on Resources; syncs `PlayerDay` and `HistoryTime` (for time-gated endings)

## [0.5.0] - 2026-09-12

Adds **DragonSword: Awakening**; slot glob fix, Chinese CID labels, busy overlays, and About copy fix.

### Added

- **DragonSword: Awakening** (HOUND13, Steam AppID 4570720): SQLCipher v4 slot `*_SlotN.db`; currency, stackables, cooking/recipes, characters, team, equipment, unlock (characters/titles/karma), owned cosmetics/mounts, world position
- Validation: amounts and stacks must be non-negative and finite; positions must be finite; team CIDs must be owned or empty (`0`)
- Bilingual CID label catalog; editor hint linking to the [th.gl database](https://dragonswordawakening.th.gl/)
- README Shields.io badges (downloads / version / license / Windows)

### Fixed

- Host `slotFilePatterns` multi-star globs (DragonSword `*/*_Slot*.db` no longer finds a folder with zero slots)
- About disclaimer always uses the multi-game product wording (never SaveSmith / current game as the sole rights holder)
- Busy overlay for load / save / tab switch; yield a frame before heavy serialize so “Saving…” can paint

### Changed

- DragonSword cover replaced with Steam store header (© HOUND13)

### Infrastructure / Docs

- Game notes in `docs/games/dragon-sword.en.md`; codec follows the [gfriloux public format docs](https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs) (clean-room; no community editor source)
- Catalog tooling: `scripts/convert-dragon-sword-catalog.mjs` + local `merge-dragon-sword-zh-from-pak.mjs` (`Zh_CN`)

## [0.4.1] - 2026-09-11

Fixes editor number inputs that would not stick; unit table shows level.

### Fixed

- Host `session.revision` + table-row snapshots so Chaos Front unit XP / planet stats / resources InputNumbers refresh after in-place `markRaw` edits
- Formation tab drops fragile `invTick`; all tabs subscribe to `editor.rev`
- Same hardening for Terraria character / inventory and Wanderburg resources
- Chaos Front: sanitize 未使用 unit unlocks on load; filter placeholders from Add Unit
- Wanderburg: validate silver field (`INVALID_SILVER`)

### Changed

- Chaos Front units table: dedicated Level column (`+N`), aligned with pilots layout

### Infrastructure

- `useSessionBindings` / `editorBindings`; reactivity contract tests

## [0.4.0] - 2026-09-11

Adds **Terraria**; Chaos Front unlock skips unused placeholders; clearer backups.

### Added

- **Terraria**: vanilla player `.plr` (character stats, coins, hotbar / inventory / equipment); searchable item catalog
- Backup panel shows local timestamps and file sizes

### Fixed

- Chaos Front: unlock-all / checklist skips unit types named 未使用 (unlocking them crashes the game)

### Infrastructure / Docs

- `npm run dist` emits `SaveSmith-<version>-windows-x64.exe`; Release workflow matches
- README / hand-test notes for Terraria; details in `docs/games/terraria.en.md`

## [0.3.0] - 2026-09-10

Branding and docs cleanup; header donate.

### Added

- Header **Donate**: WeChat / Alipay QR codes + [PayPal](https://paypal.me/gundamff) (same dialog from About)

### Changed

- Refresh 存档酱 branding: desktop icons, header/About logo, and README banner use the new chibi mascot
- README uses a supported-games table linking to `docs/games/*`; add UI screenshots

## [0.2.0] - 2026-09-09

Second release. Adds **Wanderburg**, 存档酱 branding, and a full unlock catalog with bilingual names.

### Added

- **Wanderburg** module: nested `Generation_*/SaveData.json` slots; `StringCipher` (Rijndael-256-CBC + PKCS7) decrypt/write; keeps `SaveData.backup.json` in sync
- Resources tab: silver / silver before last run
- Unlock tab: full `UnlockableData.allUnlockables` checklist; names follow UI locale (official `LocaTest_zh`, English fallback)
- Branding: Chinese name 存档酱, logo, library polish; Wanderburg cover art

### Fixed

- Silver edits reverting on blur; wrong padding causing the game to reject saves and restore from backup
- Backup delete in UI; backup names use `SaveData_{stamp}.bak`

### Infrastructure / Docs

- Nested relative-path slot discovery; Wanderburg unlock-catalog extraction runbook (kept local, not in the repo)
- GitHub Actions `CI` / `Release` (portable build on `v*` tags)

## [0.1.0] - 2026-09-09

First release. Windows x64 **portable** exe. Ships *Chaos Front* only.

### Added

- Game library: cover, localized names, save-folder probe, Steam store page (AppID 2770330)
- Editor: slot list, resources / planets / formation / units / pilots / unlock / collection
- Header shows current game, save folder, and slot; slot subtitle is in-game save time
- Auto-backup before save (last 10 copies per file under `backup/`)
- Windows overwrite uses atomic replace; a failed write keeps the live file
- Chinese / English UI; uses system WebView2 (no bundled Chromium)

### Notes

- Unofficial, single-player only. Quit the game first and test on a **copy**
- One-click fill buttons live inside tabs, not beside them
- No macOS / Linux build in this release
