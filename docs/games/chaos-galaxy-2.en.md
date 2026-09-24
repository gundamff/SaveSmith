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
| Planets | Owning faction (named select), defense, resistance, labour, HQ level (building arrays read-only in phase 1) |
| Commanders | XP, admin / military / intellect / breeding, star; **skill chips** (named select); talent / strategy / tactics read-only. Defaults to my faction with search; max-my-faction. **No add/delete**; the Faction column is **inferred** from fleet assignment / faction leaders and is not editable here |
| Fleets | Card layout: faction / commander / flagship + unit-slot grid (**Level / Power / Energy**). Defaults to my faction. **No add/delete of fleets or unit slots in phase 1**. To count someone as yours: assign them as commander on one of your fleets (or change that fleet’s faction) |
| Unlock | Play-faction `*Unlocked` flags (e.g. alien content unlock); unlock-all known |
| Collection | Light commander / unit / event bits (`config.cg2` bitmasks) |

Slots: up to six (player name). Volume, resolution, and language keys in `config.cg2` are **not** edited. Auto-backup before write (last 10 per file); restore from the backup panel.

## Screenshots

![Resources](../screenshot/chaos-galaxy-2-resources.png)

![Planets](../screenshot/chaos-galaxy-2-planets.png)

![Commanders](../screenshot/chaos-galaxy-2-commanders.png)

![Fleets](../screenshot/chaos-galaxy-2-fleets.png)

![Collection](../screenshot/chaos-galaxy-2-collection.png)

## Notes

1. **Quit the game** completely before editing (it may overwrite on exit).
2. Test on a **copy** of the save first.
3. Host write policy: backup → temp file → atomic replace; invalid saves are rejected.
4. Steam Cloud / editing while the game is running is not guaranteed safe.
5. **Commanders have no standalone “owner faction” field.** Unlike Chaos Front’s pilot roster, CG2 does not support “recruit / add commander.” To show someone under **My faction**, open **Fleets**, assign that commander to one of your fleets (and clear them from enemy fleets if needed)—do not expect to edit the Faction column on the Commanders tab.

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
