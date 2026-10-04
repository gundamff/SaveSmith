# ACE COMBAT 8: WINGS OF THEVE

[中文](ace-combat-8.md) | [**English**](ace-combat-8.en.md)

Unofficial save-editor notes. Rights holder: **Bandai Namco Entertainment** (Steam AppID [2288340](https://store.steampowered.com/app/2288340/)). Not affiliated with the official game. Module cover is the Steam store header; artwork © Bandai Namco.

Deepening roadmap (docs → lightweight unlocks → richer tabs): [design](../design/2026-10-04-ace-combat-8-deepening-design.md) · [plan](../design/2026-10-04-ace-combat-8-deepening-plan.md)

## Save location

Default (Windows):

`%LOCALAPPDATA%\BANDAI NAMCO Entertainment\ACE COMBAT 8\Saved\SaveGames`

Identify file: `Campaign.sav` (UE5 GVAS / `LiveCampaignSaveGame`). This module edits the campaign save only — not `System.sav` / Online / Replay.

## Checksum

The outer `Checksum` (`UInt32Property`) must match the `PackedData` payload or the game reports a corrupted save.

Recovered game-side formula (exe / community editor):

```text
Checksum = FCrc::MemCrc32(PackedDataBytes, FCrc::StrCrc32(TEXT("XnMVqmFJnH!2")))
```

- Salt string: `XnMVqmFJnH!2` (UE `StrCrc32` feeds each TCHAR as 4 bytes)
- That seed is the commonly cited **`0x41916EBD`**
- SaveSmith: reflected CRC-32 (poly `0xEDB88320`), init `~0x41916EBD`, final XOR `0xFFFFFFFF`, over PackedData **byte payload** (not the outer count header)
- When resizing arrays inside PackedData, update outer `dataSize` / `count`

## FeatureFlagMask (`ELiveFeature`)

| Bit | Name | Notes |
|-----|------|-------|
| 1 | AceDifficulty | Ace difficulty (see trio below) |
| 2 | AircraftSet | Aircraft Set |
| 3 | AircraftTree | Aircraft tree menu |
| 4 | Skin | Skins feature |
| 5 | Emblem | Emblems feature |
| 6 | Part | Parts |
| 7 | Training | Training |
| 8 | MusicPlayer | Music player |
| 9 | SpWeapon2ndSlot | Second SP weapon slot |
| 10 | Weathering | Weathering |
| 11 | FreeMission | Free Mission |
| 12 | FreeFlight | Free Flight |
| 13 | DataViewer | Data viewer |

Typical masks:

- Mid-game sample: `0x38C8`
- Normal cleared save: `0x3EFC` (clear delta `0x634`)
- Fuller 100% reference: `0x3EFE` (`0x3EFC` plus **AceDifficulty**)

### Ace difficulty trio

Flipping Feature bit 1 alone is often not enough. Reference editors also:

1. `FeatureFlagMask |= (1 << AceDifficulty)`
2. Activate `UnlockData` entry id **`1800001`** (`bIsActivated = true`)
3. Add `ELiveMenuMiscFlagID::NewAceDifficulty` to `MenuMiscFlags`

## What you can edit (SaveSmith today)

| Tab | Contents |
|-----|----------|
| Resources | Current MRP and cumulative TotalMRP; sync total to current |
| Progress / Playthrough | Completion count, last completed / played mission IDs, FeatureFlag / Free Mission / hangar / tree summaries; post-clear unlocks or pseudo NG+ |

Do not manually set last completed / played mission IDs to 30/31. Bulk skin/emblem lists and the Ace trio are plan **A**; owned aircraft map / mission ranks are plan **B**.

### Screenshots

| Resources | Progress / Playthrough |
|:---:|:---:|
| ![Resources](../screenshot/ace-combat-8-resources.png) | ![Progress](../screenshot/ace-combat-8-progress.png) |

## Reference save count summary

Counts come from local analysis snapshots (e.g. `src/games/ace-combat-8/data/reference-100pct-snapshot.json`). This is **not** redistribution of third-party full save binaries — do not commit Nexus `.sav` files into this repo.

| Field | mid fixture | cleared fixture | 100% reference (local) |
|------|-------------|-----------------|-------------------------|
| FeatureFlagMask | `0x38C8` | `0x3EFC` | `0x3EFE` |
| CompletionCount | 0 | 1 | 1 |
| LastCompleted / LastPlayed | 5 / 5 | 31 / 31 | 3 / 3 |
| UnlockedFreeMissionIDs | 5 | 31 | 31 |
| UnlockedHangarSituationIDs | 5 | 31 | 31 |
| UnlockedAircraftTreeNodeIDs | 54 | 90 | 97 |
| UnlockedSkinIdList | 5 | 525 | 882 |
| UnlockedEmblemIdList | 95 | 112 | 285 |
| UnlockedMedalIdList | 0 | 12 | 29 |

Note: the 100% reference leaves the cursor on mission 3 — full unlocks do not require sitting on 30/31.

## Capability matrix vs reference editor

Compared with [RivaTesu/ac8-save-editor](https://github.com/RivaTesu/ac8-save-editor) (MIT; separate assets zip — not bundled here):

| Capability | SaveSmith | Reference editor | Plan |
|------------|-----------|------------------|------|
| MRP / Checksum | yes | yes | — |
| FeatureFlag / FreeMission / Hangar / Tree merge | partial | yes | **A** align to 100% |
| Ace difficulty trio | no | yes | **A** |
| OwnedAircrafts / Skins / Emblems / Medals / Parts | no | yes | **B** |
| CompletedMissionList ranks | no | yes | **B** |
| System.sav | no | yes | B optional |
| Full UnlockData | no | yes | A minimal (Ace) + B |
| Advanced property tree | no | yes | **out of scope** |

## Notes

1. **Quit the game** completely and temporarily **disable Steam Cloud** before editing.
2. Test on a **copy** first; Save auto-backs up (last 10 per file).
3. Pseudo NG+ keeps hangar/MRP, resets the mission cursor to 0, and enables post-clear features. Campaign DLC aircraft still need `CompletionCount ≥ 1`.
4. Do not use for online play or redistribute modified saves.

## Developers

- Module: `src/games/ace-combat-8/`
- Snapshot script: `node scripts/ac8-snapshot-save.mjs <Campaign.sav> [out.json]`
- Design: [2026-10-02](../design/2026-10-02-ace-combat-8-design.md) · [deepening 2026-10-04](../design/2026-10-04-ace-combat-8-deepening-design.md)

Back to [README](../../README.en.md).
