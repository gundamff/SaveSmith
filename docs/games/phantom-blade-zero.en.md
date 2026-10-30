# Phantom Blade Zero

Unofficial, offline-only save editing. Rights holder and developer: S-GAME Studio. Publisher: S-GAME Publishing. Steam AppID `4115450`.

Currently verified against Steam build `26266538`. A game update may change the format or key; SaveSmith refuses to write when authentication fails.

## Save location and slots

Default directory:

`...\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\`

The only physical main save is `PBZSaveGame.sav`. SaveSmith exposes its internal `AutoSaveN` / `ManualSaveN` entries as editable slots.

- `1RealTime`, `2Hourly`, and `3Daily` are the game's own backup directories, not SaveSmith slots.
- `__Advanced__` and `__Achievements__` are special slots preserved read-only.
- Settings saves are unsupported.

The format is PBZS v3: AES-256-GCM authenticated encryption, Oodle for reading compressed slots, and zlib for rewritten slots. Authentication or parsing failure blocks saving.

## Editable scope

The resources page keeps internal slot selection and splits inventory into two tabs: **Weapon Upgrade Materials** and **Consumables**.

- `Player.Dust` is shown as 意识尘埃 in Chinese; the storage field remains `Dust`. English UI keeps `Dust` because this build's `en` resources have no translation
- 27 weapon-upgrade materials: edit existing amounts, or search by official Simplified Chinese name / raw ID and add missing ones
- Material amounts are limited to `0..9999`; raising `CurrentAmount` above its old `MaxAmount` raises `MaxAmount` with it
- Consumables currently include only the audited `Item_Traversing` (穿行符). Amounts may be edited or added. SaveSmith caps it at `0..99`; that is an application safety limit, not an official directory value
- Adding an item that already exists increases its amount instead of creating a duplicate record
- Names come from build `26266538` Simplified Chinese resources. This build's English resources contain no translations for these 28 item-name keys, so English UI falls back to Chinese names instead of inventing English ones

Threshold collectibles such as memory flowers, black-stone fragments, and killing-aura amber are unsupported, as are weapons, accessories, quest items, keys, story items, equipment levels, achievements, DLC, and settings saves.

## Safety

1. **Quit the game completely** before editing.
2. Copy the entire SteamID64 save directory and verify changes against that copy first.
3. Disable Steam Cloud, or accept that cloud sync may overwrite or roll back local changes.
4. This is an unofficial tool for legitimate, offline single-player use only.

## Oodle and artwork

Oodle reads use a clean-room, MIT-licensed [`oozextract 0.5.7`](../../src/games/phantom-blade-zero/codec/oodle/UPSTREAM.md) portable WASM build. SaveSmith does not use GPL `ooz-wasm` and does not bundle an official Oodle DLL. See the bundled [`LICENSE`](../../src/games/phantom-blade-zero/codec/oodle/LICENSE).

The cover is the Steam App `4115450` store header. Copyright remains with the rights holders; it is used only to identify the game in the SaveSmith library.

See the [design document](../design/2026-10-30-phantom-blade-zero-design.md) for format details and implementation boundaries.
