# Wanderburg

[中文](wanderburg.md) | **English**

Unofficial save-editor notes. Rights holder: **Randwerk** / Sidekick Publishing (Steam AppID [3624140](https://store.steampowered.com/app/3624140/)). Not affiliated with the publisher.

> Early Access: save formats may change. Editing depends on the current key and round-trip tests.

## Save location

Default (Windows):

`%USERPROFILE%\AppData\LocalLow\Randwerk\Wanderburg`

Slots look like: `Saves/Playtest/Generation_*/SaveData.json`.

Saves use `SaveLoad.StringCipher` encrypted JSON.

## What you can edit

| Tab | Contents |
|-----|----------|
| Resources | e.g. `silver`, `silverBeforeLastRun` |
| Unlock | `unlockedIDs` checkboxes (captain / crew / cabin / vehicles·weapons / decor·pets, etc.) |

Auto-backup before write (last 10 per file); restore from the backup panel.

## Screenshots

![Unlock](../screenshot/wanderburg-unlock.png)

## Notes

1. **Quit the game** completely before editing.
2. Test on a **copy** of the save first.
3. After EA updates, load/write may break until the module is adapted—check the release notes.

Back to [README](../../README.en.md).
