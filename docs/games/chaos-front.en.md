# Chaos Front

[中文](chaos-front.md) | **English**

Unofficial save-editor notes. Rights holder: **ChaosGalaxyStudio** (Steam AppID [2770330](https://store.steampowered.com/app/2770330/)). Not affiliated with the publisher.

## Save location

Default (Windows):

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

Identify files such as `savedata0.cf` … `savedata5.cf` and `collection.cf`.

## What you can edit

| Tab | Contents |
|-----|----------|
| Resources | Committee calendar (Y/M/D), credits, prestige, stars, medals / relationships |
| Planets | Economy / industry / defense / stability and owning faction |
| Formation | 4×6 grid deploy / undeploy / swap; assign pilots |
| Units / ships | Level, XP, gear; add / remove |
| Pilots | Level, XP, and related stats |
| Unlock all | Unit types and equipment |
| Collection | Endings and collection fill (`collection.cf`) |

Slots: up to six (army name, save time). Auto-backup before write (last 10 per file); restore from the backup panel.

## Screenshots

![Formation](../screenshot/chaos-front-formation.png)

![Units / ships](../screenshot/chaos-front-units.png)

## Notes

1. **Quit the game** completely before editing (it may overwrite on exit).
2. Test on a **copy** of the save first.
3. Host write policy: backup → temp file → atomic replace; invalid saves are rejected.

## Developers: data extraction

Unit lists, level tables, names, and icons come from `scripts/extract-game-data.mjs` (outputs `src/games/chaos-front/data/game-data.json` and `src/games/chaos-front/assets/game/`).

**You need**: the game install (with `Chaos Front_Data`) and [AssetRipper](https://github.com/AssetRipper/AssetRipper) (free GUI build is fine).

```bash
node scripts/extract-game-data.mjs --game "path\to\Chaos Front_Data" --ripper "C:\tools\AssetRipper.GUI.Free.exe" --out .
```

- `--game` (required): path to `Chaos Front_Data`
- `--ripper`: AssetRipper executable; omit for tables only
- `--out`: repo root (default: current directory)
- `--export <dir>`: reuse an existing AssetRipper export

Back to [README](../../README.en.md).
