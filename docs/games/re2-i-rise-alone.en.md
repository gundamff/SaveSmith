# Re2 I Rise Alone

[中文](re2-i-rise-alone.md) | **English**

Unofficial save-editing notes. Rights holder **Proudmate Entertainment** (Steam AppID [3816120](https://store.steampowered.com/app/3816120/)). Not affiliated with the rights holder. Library cover is the Steam library header; artwork © the rights holder.

## Save location

`%USERPROFILE%\AppData\LocalLow\ProudmateEntertainment\重生2我独自逆袭\`

| File | Role |
|------|------|
| `SaveData.dat` | All manual/auto slots (single encrypted JSON bag) |

## Editable

| Tab | Content |
|-----|---------|
| Resources | All protagonist base stats (`GetAllPropertyKey`); missing keys are created on save |

| UI | `Data` key |
|----|------------|
| Physique | `property_Property_Stamina` |
| Wisdom | `property_Property_Wisdom` |
| Charm | `property_Property_Charm` |
| Morality | `property_Property_Morality` |
| Alcohol tolerance | `property_Property_CapacityForLiquor` |
| Action points | `property_Property_Execution` |
| Money | `property_Property_Money` |
| Pressure | `property_Property_Pressure` |

**Rule:** all eight fields are always shown; missing keys display as 0 and are created when you save. On-screen values may include temporary round buffs.

**Out of scope:** favorability (including `MMFavorability`), codex/unlocks, items, story flags, outer mgr bag, `CurKey`, etc.

AES-192-ECB-PKCS7 encrypted UTF-8 JSON bag (clean-room). Key derived from in-game constants; decryption uses the existing SaveSmith dependency `node-forge`—no standalone runtime bundled with this game module.

## Notes

1. **Fully quit the game** before saving edits.
2. Prefer a **copy** of the save; the tool also auto-backs up.
3. Saves replace only dirty slots’ `{uuid}_Data` strings; other outer keys and untouched slots stay as-is, then the whole bag is re-encrypted to `SaveData.dat`.
4. Steam Cloud syncs `*.dat` and may roll back local edits.
5. No hard caps on validation; extreme values may be clamped or misbehave in-game.

## Tests

Real-save smoke is gated by `RE2IRA_SAVE` (path to a `SaveData.dat` copy):

```
RE2IRA_SAVE=<path\to\SaveData.dat> npm test
```

Back to [README](../../README.en.md).
