# DragonSword: Awakening

[中文](dragon-sword.md) | **English**

Unofficial save-editor notes. Rights holder: **HOUND13** (Steam AppID [4570720](https://store.steampowered.com/app/4570720/)). Not affiliated with the publisher. Module cover is the Steam store header; artwork © HOUND13.

CID labels come from the public derived catalog plus a local pak `StringData.xml` Simplified Chinese (`Zh_CN`) overlay (see `src/games/dragon-sword/catalog/SOURCE.md`). Unknown CIDs still render as `#CID`.

> **Offline / single-player only.** Do not edit saves used in online play, raids, or any mode that checks progress on a server. Quit the game completely before editing, and consider turning off Steam Cloud so a cloud copy cannot roll back your local file.

## Save location

Default (Windows, typical Steam install):

`%PROGRAMFILES(X86)%\Steam\steamapps\common\DragonSword  Awakening\DS\Saved\SaveGames`

Other Steam libraries follow the same shape: `<library>\steamapps\common\DragonSword  Awakening\DS\Saved\SaveGames`. The install folder name has **two spaces** in the title.

Slots look like: `<accountId>/<accountId>_SlotN.db` (SQLCipher v4 encrypted SQLite). This module does not read or write `SPack_Slot*.sav` (UE slot summaries) or screenshots.

If detection fails, use **Choose save folder** and point at `SaveGames` (numeric account folders underneath).

## Looking up CIDs

Saves identify items/characters by numeric **CIDs**. The editor ships a bilingual label catalog; to cross-check or find IDs yourself, use the community database:

- [th.gl · DragonSword: Awakening](https://dragonswordawakening.th.gl/) (characters, gear, cooking, materials, …)

The DragonSword editor also shows this link at the top of the edit pane.

## Format notes

Slot codec and schema are a clean-room implementation from public format notes — **no community editor source was copied**. Format reference:

[gfriloux/dragonsword-save-editor — docs/](https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs)

CID labels come from **derived JSON** exported from a local pak (see `scripts/README-dragon-sword-catalog.md` in the repo). Raw game XML is not committed. Unknown CIDs render as `#CID`.

## What you can edit

| Tab | Contents |
|-----|----------|
| Currency | `tb_currency` amounts; max-all action |
| Items | Stackable counts; add by CID |
| Cooking | Cook-item stacks; recipe switch unlocks (earnable set) |
| Characters | Level, XP, ascend |
| Team | Three slot CIDs (owned characters or empty) |
| Equipment | Enchant, XP, lock; stat CIDs read-only |
| Unlock | Owned characters, title bitmask, karma (no unpaid inserts) |
| Cosmetics | Owned costumes / vehicles / mounts only — no unowned paid CIDs |
| World | Region, section, position |

Auto-backup before write (last 10 per file); restore from the backup panel. Save is rejected if amounts/stacks are negative or non-finite, positions are non-finite, or a team CID is neither `0` nor an owned character.

## Notes

1. **Quit the game** completely before editing (`DSClient-Win64-Shipping.exe`; it may overwrite on exit).
2. **Turn off Steam Cloud** in the game’s Steam properties until you confirm the edit, or the cloud copy may restore the old file.
3. For owners of a legitimate copy, **local / offline / single-player** study only. Do not use online or distribute modified saves.
4. Test on a **copy** of the save first.
5. After game updates, load/write may break until the module is adapted—check the release notes.

Back to [README](../../README.en.md).
