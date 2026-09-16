# Chaos Galaxy 2

[中文](chaos-galaxy-2.md) | **English**

Unofficial save-editor notes. Rights holder: **ChaosGalaxyStudio** (developer Han Zhiyu; Steam AppID [1537910](https://store.steampowered.com/app/1537910/)). Not affiliated with the publisher.

Saves are Easy Save 3 **binary** (`.cg2`), not the ES3 JSON used by Chaos Front.

## Save location

Default (Windows):

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\ChaosGalaxy2`

Identify files such as `savedata0.cg2` … `savedata5.cg2` and `config.cg2`.

## What you can edit

| Tab | Contents |
|-----|----------|
| Resources | Play-faction gold / supply / prestige, economics level, play month |
| Planets | Owning faction, defense, resistance, labour, HQ level (building arrays read-only in phase 1) |
| Commanders | XP, admin / military / intellect / breeding, star, skills; **edit values only, no add/delete** |
| Fleets | Existing fleets’ commander and `Unit1..14` slots; **no add/delete of fleets or unit slots in phase 1** |
| Unlock | Existing `*Unlocked` flags for the play faction; unlock-all known |
| Collection | Light commander / unit / event bits (`config.cg2` bitmasks) |

Slots: up to six (player name). Volume, resolution, and language keys in `config.cg2` are **not** edited. Auto-backup before write (last 10 per file); restore from the backup panel.

## Notes

1. **Quit the game** completely before editing (it may overwrite on exit).
2. Test on a **copy** of the save first.
3. Host write policy: backup → temp file → atomic replace; invalid saves are rejected.
4. Steam Cloud / editing while the game is running is not guaranteed safe.

## Developers: data extraction

Commander, unit, planet, and building names plus caps come from `scripts/extract-chaos-galaxy-2.mjs` (outputs `src/games/chaos-galaxy-2/data/game-data.json` and `src/games/chaos-galaxy-2/assets/game/`). There is no standalone commander level table in the game data; XP / resource caps fall back to conservative constants in the script.

**You need**: the game install (with `ChaosGalaxy2_Data`). Icons need [AssetRipper](https://github.com/AssetRipper/AssetRipper) (free GUI build is fine); omit it for tables only.

```bash
node scripts/extract-chaos-galaxy-2.mjs --game "path\to\ChaosGalaxy2_Data" --ripper "C:\tools\AssetRipper.GUI.Free.exe" --out .
```

- `--game` (required): path to `ChaosGalaxy2_Data`
- `--ripper`: AssetRipper executable; omit for tables only (`--json-only`)
- `--out`: repo root (default: current directory)
- `--export <dir>`: reuse an existing AssetRipper export

Back to [README](../../README.en.md).
