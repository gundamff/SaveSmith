# ACE COMBAT 8: WINGS OF THEVE

[中文](ace-combat-8.md) | [**English**](ace-combat-8.en.md)

Unofficial save-editor notes. Rights holder: **Bandai Namco Entertainment** (Steam AppID [2288340](https://store.steampowered.com/app/2288340/)). Not affiliated with the official game. Module cover is the Steam store header; artwork © Bandai Namco.

## Save location

Default (Windows):

`%LOCALAPPDATA%\BANDAI NAMCO Entertainment\ACE COMBAT 8\Saved\SaveGames`

Identify file: `Campaign.sav` (UE5 GVAS / `LiveCampaignSaveGame`). This module edits the campaign save only — not `System.sav` / Online / Replay.

On write, SaveSmith recomputes `Checksum` with the game formula (`CRC32(PackedData, seed 0x41916EBD)`); otherwise the game reports a corrupted save.

## What you can edit

| Tab | Contents |
|-----|----------|
| Resources | Current MRP and cumulative TotalMRP; sync total to current |
| Progress / Playthrough | Completion count, last completed / played mission IDs, summaries for FeatureFlag / Free Mission / hangar situations / aircraft-tree nodes; one-click post-clear unlocks (full mask + hangar + tree nodes), or pseudo NG+ (reset story cursor + the same unlocks) |

Do not manually set last completed / played mission IDs to 30/31 — the campaign can soft-lock on the finale. Use Pseudo NG+ to reset the cursor to 0. Bulk skin ID injection is not implemented yet; some skins may still need in-game unlocks even after the FeatureFlag bit is set.

### Screenshots

| Resources | Progress / Playthrough |
|:---:|:---:|
| ![Resources](../screenshot/ace-combat-8-resources.png) | ![Progress](../screenshot/ace-combat-8-progress.png) |

## Notes

1. **Quit the game** completely and temporarily **disable Steam Cloud** before editing (cloud sync may overwrite local changes).
2. Test on a **copy** first; Save auto-backs up (last 10 per file).
3. Pseudo NG+ keeps hangar and MRP, resets the mission cursor to 0, and enables post-clear features (skins / emblems / Aircraft Set, etc.). DLC aircraft in campaign still need `CompletionCount ≥ 1`.
4. Do not use for online play or redistribute modified saves.

Back to [README](../../README.en.md).
