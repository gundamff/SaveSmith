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
- **Party:** EXP, HP, MP, weapon/armor/vision equip IDs
- **Items:** stack qty; add by ID (clamped 0–99)
- **Visions:** awakening; max synchro points
- **Maps:** known / visited / cleared
- **Actions:** max Gil, reveal maps

Not yet: artifacts, bestiary/Libra, deep Journal, full name/icon catalog. Story progress is left alone by default.

## Notes

1. **Quit the game first**; disable Steam Cloud while editing.
2. The host backs up before write; still copy your save folder.
3. Unofficial; not affiliated with Square Enix / LANCARSE.
4. Format notes acknowledge the public README of [ffr-save-editor](https://github.com/jesus-seijas-sp/ffr-save-editor) (MIT); implementation is Clean-room.
5. `cover.jpg` is a placeholder until a store header is substituted with attribution.
