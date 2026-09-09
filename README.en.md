# SaveSmith

An open-source **single-player save editor** (Tauri 2 + Vue 3). It edits structured save files on disk. It is not a memory trainer.

v1 ships **Chaos Front** only. The game’s name, trademarks, and assets belong to **ChaosGalaxyStudio** and the respective rights holders.

**Download:** [Releases](https://github.com/gundamff/SaveSmith/releases) · **中文：** [README.md](README.md) · **Changes:** [CHANGELOG.md](CHANGELOG.md)

## Disclaimer

- **Unofficial.** This tool is not affiliated with, authorized by, or endorsed by ChaosGalaxyStudio or the game’s publisher.
- **Single-player only.** For personal, offline study by owners of a legitimate copy. Online / multiplayer use and any commercial use are prohibited.
- **Quit the game first.** The app reminds you; it does not kill the process or steal file locks. Editing while the game is running can corrupt the save or fail the write.
- Back up first. Test against a **copy** of the save, not your only live file.

Reasonable takedown or block requests from rights holders will be honored for the affected game module.

## Requirements

- **Windows x64** (v1 does not promise macOS / Linux releases)
- **WebView2**: usually already present on Windows 10 / 11. If the app fails to start because WebView2 is missing, install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (Evergreen). Do not bundle a full Chromium.

## Download and use

1. Download the **portable** `SaveSmith-0.1.0-windows-x64.exe` from [Releases](https://github.com/gundamff/SaveSmith/releases) (or build it below) and run it from any folder. No registry, no Program Files. WebView2 must already be on the machine (see above).
2. Prefer an installer? `npm run dist:installer` builds NSIS (`SaveSmith_*_x64-setup.exe`).
3. **Fully quit** Chaos Front, then start SaveSmith.
4. The library should show a single Chaos Front card. **Store page** opens Steam AppID `2770330`.
5. If auto-detect fails, use **Choose save folder**. A wrong folder shows “This folder is not a save directory for this game”.
6. Load a slot, then edit in the **Resources / Planets / Formation / …** tabs. One-click fill buttons live inside those pages, not next to the tabs. **Save** writes to disk; the host backs up each changed file (last 10 copies in `backup/`) and writes atomically.

Default Windows save folder:

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

## Features (0.1)

- Library probes the default save folder and allows a manual pick; the top bar shows the current game, folder, and slot
- Chaos Front: resources, planets, formation, units, pilots, unlock, collection
- Saves are backed up under `backup/` (last 10 copies per file); a failed overwrite does not delete the live file
- Chinese / English UI; the library cover is the Steam header (rights remain with the publisher)

## Architecture

Host (shell + IO) and game modules live in one repo and register at compile time. Modules never touch the disk. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

You need Node.js, Rust (`cargo`), and MSVC build tools on Windows.

```powershell
npm install
npm test
npm run typecheck
npm run tauri dev
npm run dist
```

Default build is a **portable** single file at `src-tauri/target/release/savesmith.exe` (copy it anywhere). For an installer, `npm run dist:installer` writes NSIS under `src-tauri/target/release/bundle/nsis/`.

## License

Application code is [MIT](LICENSE), Copyright SaveSmith contributors. Game rights remain with their owners.
