# Changelog

[中文](CHANGELOG.md) | **English**

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
