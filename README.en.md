# SaveSmith

An open-source **single-player save editor** (Tauri 2 + Vue 3). It edits structured save files on disk. It is not a memory trainer.

v1 ships **Chaos Front** only. The game’s name, trademarks, and assets belong to **ChaosGalaxyStudio** and the respective rights holders.

**中文：** [README.md](README.md)

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

1. Get the Windows x64 installer (NSIS) from this repo’s Releases, or build it with the commands below.
2. **Fully quit** Chaos Front, then start SaveSmith.
3. The library should show a single Chaos Front card. **Store page** opens Steam AppID `2770330`.
4. If auto-detect fails, use **Choose save folder**. A wrong folder shows “This folder is not a save directory for this game”.
5. Load a slot, use the action bar or deep-edit tabs, then **Save**. The host backs up each changed file (last 10 copies in `backup/`) and writes atomically.

Default Windows save folder:

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

## Development

You need Node.js, Rust (`cargo`), and MSVC build tools on Windows.

```powershell
npm install
npm test
npm run typecheck
npm run tauri dev
npm run tauri build
```

`npm run tauri build` produces a Windows x64 NSIS installer under `src-tauri/target/release/bundle/`.

## License

Application code is [MIT](LICENSE), Copyright SaveSmith contributors. Game rights remain with their owners.
