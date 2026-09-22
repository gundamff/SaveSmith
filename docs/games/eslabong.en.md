# Eslabong

[中文](eslabong.md) | [**English**](eslabong.en.md)

Unofficial save-editor notes. Rights holder: **shirowita** (Steam AppID [4560660](https://store.steampowered.com/app/4560660/)). Not affiliated with the official game. Module cover is the Steam store header; artwork © shirowita.

> Early Access: save formats may change. Writes depend on sidecar `integrity` matching the current build.

## Save location

Default (Windows):

`%USERPROFILE%\AppData\Roaming\Godot\app_userdata\Eslabong`

Example identify files: `campaign_save_0.json`, `campaign_autosave.json` (paired `.res` files). Only manual slots and the current autosave are listed — not the `campaign_autosave_N` history ring.

Progress lives in `.res` (Godot RSCC-compressed resource). The sidecar `.json` is a summary; Save recomputes `integrity` and keeps `gold` in sync with `.res` `player_gold`.

## What you can edit

| Tab | Contents |
|-----|----------|
| Overview | Gold, renown, development stars; team name / season / week / saved-at are read-only |
| Fighters | Existing roster mercs: level/XP, growth styles, AI leanings, birth/growth/career stats, personality, skill slots, clear injury; edit equipped relic rolled stats in place (no add/delete mercs) |
| Items | Existing instances: quality, rolled modifiers, `stats` (no add/delete; market listings untouched) |

Editable scalars use static hard bounds; the UI clamps inputs and validation rejects out-of-range values on save.

Auto-backup before write (last 10 per file); restore from the backup panel. Challenge Tower / PVP fields are opaque passthrough and not shown in the editor.

## Notes

1. **Quit the game** completely before editing (it may overwrite the save on exit).
2. Test on a **copy** of the save first.
3. After EA updates, load/write may break until the module is adapted—check the release notes.
4. Steam Cloud is not guaranteed. Mismatched sidecar/`.res` pairs (e.g. a bad autosave pair) may fail to open or save.

Back to [README](../../README.en.md).
