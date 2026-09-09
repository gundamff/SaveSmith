# Changelog

[中文](CHANGELOG.md) | **English**

## [Unreleased]

### Infrastructure

- GitHub Actions: `CI` (tests on push/PR) and `Release` (build and publish on `v*` tags)

### Docs

- README / CHANGELOG / release notes aligned with chaos-front-save-editor (bilingual, disclaimer, data extraction)

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
