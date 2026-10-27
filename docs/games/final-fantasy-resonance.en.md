# FINAL FANTASY RESONANCE

Unofficial save editing. Rights holder: Square Enix. Developer: LANCARSE. Steam AppID `3259780`.

## Save location

`%LOCALAPPDATA%\FFRS\Steam\<SteamID64>\`

| File | Notes |
|------|------|
| `GameSaveData0.sav` | Autosave |
| `GameSaveDataN.sav` | Manual slot N |
| `OptionSaveData.sav` / `EnhancedInputUserSettings.sav` | **Not edited** |

Format: `SVHD` header + AES-256-ECB body + SHA-1; plaintext is UE5.5+ GVAS.

## Editable

- **Records:** Gil (`Player.currentMoney`); play time / wins read-only
- **Party:** EXP, HP, MP; weapon / armor / vision as **named dropdowns** (job-filtered)
- **Items:** stack qty; add via named dropdown (clamped 0–99)
- **Visions:** awakening; max synchro points
- **Maps:** known / visited / cleared
- **Bestiary:** `unitList` defeat counts + Libra (`IsAnalyzed` / `analyzedElments`)
- **Actions:** max Gil, unlock gear/consumables, unlock visions, materials pack, reveal maps, Libra-all, restock shops, reset opened chests

Names: `catalog/names.json` (`en` from public community tables; `zh` curated Simplified Chinese / classic FF terms — no kana-as-Chinese). See `catalog/SOURCE.md`.

## Notes

1. **Quit the game first**; disable Steam Cloud while editing.
2. The host backs up before write; still copy your save folder.
3. Unofficial; not affiliated with Square Enix / LANCARSE.
4. Format notes acknowledge the public README of [ffr-save-editor](https://github.com/jesus-seijas-sp/ffr-save-editor) (MIT); implementation is Clean-room.
5. `cover.jpg` is the Steam store header for App `3259780` (© Square Enix / LANCARSE); used only for in-app library recognition.
