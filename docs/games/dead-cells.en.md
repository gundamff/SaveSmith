# Dead Cells

[中文](dead-cells.md) | [**English**](dead-cells.en.md)

Unofficial save editing notes. Rights holder **Motion Twin / Evil Empire** (Steam AppID [588650](https://store.steampowered.com/app/588650/)). Not affiliated with the official parties.

> v1 supports PC (Steam) `user_N.dat` meta-progression (`S_User`) editing only; in-progress run state (`S_Game`) and mobile/console saves are not supported.

## Save location

Probed in order (a directory with `user_0.dat` / `user_1.dat` / `user_2.dat` matches):

1. **Steam Cloud sync directory** (authoritative copy while Steam Cloud is on):

   `C:\Program Files (x86)\Steam\userdata\<SteamID3>\588650\remote`

2. **`save\` under the game directory** (with Steam Cloud off):

   `<game dir>\save\` (e.g. `D:\SteamLibrary\steamapps\common\Dead Cells\save`)

With Steam Cloud on, the game's `save\` folder usually holds only the `steam_cloud.dat` marker and the real save lives in the Steam Cloud directory. If probing fails, pick one of the directories above manually.

`dc_options.json` in the same folder holds key bindings/settings and is **not** edited. Each `user_N.dat` is an independent save slot.

## Editable content

| Tab | Content |
|-----|---------|
| Resources | Gold (`deathMoney`), Cells (`deathCells`) |
| Blueprints | Item unlock table (`itemProgress`): localized item names (from the game's own localization), unlocked, new, invested cells |
| Statistics | Lifetime stats (read-only); skin / head skin (strings); Boss Rush unlock toggles |

Item display names come from the game's official localization (`lang/main.zh.mo`), extracted into `data/item-names.json` by `scripts/extract-dead-cells-names.mjs` from the installed game; unknown ids fall back to the raw identifier.

The save is a custom binary format (59-byte header + zlib + hxbit serialization) with a SHA-1 checksum in the header; the checksum is recomputed on save and untouched bytes are preserved verbatim.

## Notes

1. **Quit the game completely** before editing. Steam Cloud uploads the save when the game exits — editing while the game runs will be **overwritten** by the in-memory save on exit.
2. After editing, confirm the change in-game first; restore from the backup panel if anything breaks.
3. Try on a **copy** of your save first.
4. Skin IDs are internal identifiers (e.g. `default`); an unknown ID may cause display glitches.
5. A blueprint's "invested cells" may be a negative sentinel (e.g. `-2`) in real saves — that is internal game state and **should be left alone**; locked entries show `0`.
6. Gold/Cells have no gameplay cap enforced here beyond being non-negative integers; the game has the final say on absurd values.
7. `S_Game` (in-progress run) and `dc_options.json` are never touched — byte-level passthrough.

Each file is auto-backed-up before saving (up to 10 copies); restore from the backup panel.

## Testing

The real-save smoke test is gated by the `DC_SAVE` env var (point it at `user_0.dat`):

```
DC_SAVE=<path\to\user_0.dat> npm test
```

Back to [README](../../README.md).
