# SaveSmith

[中文](README.md) | **English**

An open-source **single-player save editor** (Tauri 2 + Vue 3). It edits structured save files on disk. It is not a memory trainer. Ships **Chaos Front** and **Wanderburg**.

> **Unofficial tool.** Not affiliated with, endorsed by, or associated with any game publisher. For personal, offline study by players who own a legitimate copy only. Do not use online, commercially, or to distribute modified saves.

![SaveSmith game library](docs/screenshot-library.png)

## Features

- **Library**: compiled games only; auto-detect save folder or pick one; header shows game, path, and slot
- **UI language**: Chinese / English; follows the system locale by default, switchable in the header; **About** shows version and GitHub URL
- **Chaos Front · saves**: six slots (army name, save time); auto-backup before write (last 10 per file); restore from the backup panel
- **Resources**: credits, prestige, stars, medals / relationships
- **Planets**: economy / industry / defense / stability and owning faction
- **Formation**: 4×6 grid deploy / undeploy / swap, and assign pilots
- **Units / ships**: level, XP, gear; add or remove
- **Pilots**: level, XP, and related stats
- **Unlock all**: unit types and equipment
- **Collection**: endings and collection fill (`collection.cf`)
- **Wanderburg · saves**: slots under `Generation_*/SaveData.json`; **Resources** (`silver`, `silverBeforeLastRun`, etc.); **Unlock** (`unlockedIDs` checkboxes). Saves use `SaveLoad.StringCipher` encrypted JSON; editing depends on the current key and round-trip tests (Early Access formats may change)

All writes follow **backup → temp file → atomic replace**. On Windows, a failed overwrite does not delete the live file. Invalid saves are rejected.

## Download

Get the latest portable exe from [Releases](../../releases) (no installer):

- `SaveSmith-<version>-windows-x64.exe` — Windows x64 portable

Requires **Windows x64** and system **WebView2** (usually already on Windows 10 / 11). If the app fails to start because WebView2 is missing, install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (Evergreen). Do not bundle a full Chromium.

## How to use

1. **Quit the game** completely before editing (the game may overwrite saves on exit)
2. Start SaveSmith and open **Chaos Front**; if the folder is not found, use **Choose save folder**
3. Default folder: `%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`
4. Load a slot on the left, edit tabs, then **Save**
5. Each save writes a timestamped backup under `backup/` (e.g. `savedata0_20260907_120000.cf.bak`), keeping the newest 10
6. **Restore** from the backup list (the current file is backed up first)
7. Test against a **copy** of the save, not your only live file
8. **Wanderburg**: default `%USERPROFILE%\AppData\LocalLow\Randwerk\Wanderburg`; slots are `Saves/Playtest/Generation_*/SaveData.json`. Quit the game before editing; EA formats may change
9. See [CHANGELOG.en.md](CHANGELOG.en.md) and [Releases](../../releases)

## Build from source

Requires Node.js 20+, npm, Rust (`cargo`), and MSVC build tools on Windows (win x64 target).

```bash
npm install
npm test
npm run typecheck
npm run tauri dev
npm run dist
```

`npm run dist` writes `src-tauri/target/release/savesmith.exe`. Optional installer: `npm run dist:installer`.

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Maintainer release: [docs/RELEASE.en.md](docs/RELEASE.en.md).

## Game data extraction

Unit lists, level tables, names, and icons come from `scripts/extract-game-data.mjs` (outputs `src/games/chaos-front/data/game-data.json` and `src/games/chaos-front/assets/game/`).

**You need**: the game install (with `Chaos Front_Data`) and [AssetRipper](https://github.com/AssetRipper/AssetRipper) (free GUI build is fine).

```bash
node scripts/extract-game-data.mjs --game "path\to\Chaos Front_Data" --ripper "C:\tools\AssetRipper.GUI.Free.exe" --out .
```

- `--game` (required): path to `Chaos Front_Data`
- `--ripper`: AssetRipper executable; omit for tables only
- `--out`: repo root (default: current directory)
- `--export <dir>`: reuse an existing AssetRipper export

## Disclaimer

1. **Unofficial / no license from the publisher**: This is a third-party fan tool. It is **not** developed, sponsored, endorsed, or affiliated with ChaosGalaxyStudio or related parties.
2. **Copyright**: *Chaos Front* and all related names, trademarks, characters, units, art, data tables, audio, and text belong to **ChaosGalaxyStudio** and other rights holders. Assets in this repo are for **local reference by legitimate owners only**, do **not** include the game itself, and must not be used commercially.
3. **Allowed use**: Personal, local, **offline** study and research only. Do not use this tool or modified saves for multiplayer, competitive abuse, rental/sale, bundling, or any commercial or infringing purpose.
4. **Use at your own risk**: Editing saves may corrupt progress, break loading, or require a reinstall. Always quit the game first and rely on automatic or manual backups. **By using this tool you accept all risk**; authors and contributors are not liable for any loss.
5. **Takedown**: If a rights holder raises a reasonable request, maintainers will review and may modify, redact, or take down releases / public access.
6. **Support the official game**: Buy and play *Chaos Front* through official channels. This tool does not replace a legal copy and does not encourage piracy.

## License

[MIT](LICENSE)
