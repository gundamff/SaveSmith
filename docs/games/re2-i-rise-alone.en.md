# Re2 I Rise Alone

[中文](re2-i-rise-alone.md) | **English**

Unofficial save-editing notes. Rights holder **Proudmate Entertainment** (Steam AppID [3816120](https://store.steampowered.com/app/3816120/)). Not affiliated with the rights holder. Library cover is a temporary placeholder pending official Steam artwork; © the rights holder when replaced.

## Save location

`%USERPROFILE%\AppData\LocalLow\ProudmateEntertainment\重生2我独自逆袭\`

| File | Role |
|------|------|
| `SaveData.dat` | All manual/auto slots (single encrypted JSON bag) |

## Editable

| Tab | Content |
|-----|---------|
| Resources | Up to 7 character stats **already present** in the slot `Data` (decimal integer strings) |

| UI | `Data` key |
|----|------------|
| Money | `property_Property_Money` |
| Stamina | `property_Property_Stamina` |
| Charm | `property_Property_Charm` |
| Wisdom | `property_Property_Wisdom` |
| Execution | `property_Property_Execution` |
| Morality | `property_Property_Morality` |
| Pressure | `property_Property_Pressure` |

**Rule:** missing keys are not shown, written, or created.

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