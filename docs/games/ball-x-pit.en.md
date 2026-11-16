# BALL x PIT

[中文](ball-x-pit.md) | **English**

Unofficial save-editing notes. Rights holders **Kenny Sun / Devolver Digital** (Steam AppID [2062430](https://store.steampowered.com/app/2062430/)). Not affiliated with the rights holders. Library cover is the Steam library hero; artwork © the rights holders.

## Save location

`%USERPROFILE%\AppData\LocalLow\Kenny Sun\BALL x PIT\`

| File | Role |
|------|------|
| `metaN.yankai` | Main progress |
| `metaN_backup.yankai` | Game-managed backup (may differ from main) |
| `saveslotinfo.balls` | Slot summary (read-only here) |

## Editable

| Tab | Content |
|-----|---------|
| Resources | Current town gold / wheat / wood / stone (`NumResources` only; not lifetime `TotalResources`) |
| Encyclopedia | Ball / passive / combination discovery; **one-click unlock** (undiscovered → 1; keep positive values) |

**Out of scope:** enemy bestiary, character unlocks, building levels, NG+, per-entry name lists.

Clean-room BinaryFormatter-style field patches. Format research credited to [VdustR/game-save-ball-pit](https://github.com/VdustR/game-save-ball-pit) (MIT); that code is not bundled.

## Notes

1. **Fully quit the game** before saving edits.
2. Prefer a **copy** of the save folder; the tool also auto-backs up.
3. Saves patch main and matching `_backup` from each file’s own bytes (never overwrite backup with a wholesale main copy).
4. Steam Cloud may roll back local edits.
5. One-click unlock may affect achievements/collection UI; enemies are not included.

## Tests

Real-save smoke is gated by `BALLXPIT_SAVE` (path to a `metaN.yankai` copy):

```
BALLXPIT_SAVE=<path\to\meta1.yankai> npm test
```

Back to [README](../../README.en.md).
