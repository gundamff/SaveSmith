# Changelog

[中文](CHANGELOG.md) | **English**

## [Unreleased]

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
