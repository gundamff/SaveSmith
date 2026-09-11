# DragonSword catalog export (clean-room)

SaveSmith ships **derived JSON only** under `src/games/dragon-sword/catalog/`. Do not commit raw game XML, pak bytes, or AES keys.

## Source (local install)

Game data lives in encrypted UE5 paks under:

```
<DragonSword install>/DS/Content/Paks/
```

Inside the mounted paks, the server dataset includes:

- `DS/Content/__GeneratedGameData__/Server/XML/GameData/GameItemData.xml` — item rows (`ID` = CID, `ItemType`, string keys)
- `DS/Content/__GeneratedGameData__/Server/XML/GameData/StringData.xml` — localized names (`Fr`, `En`, …)

Community reference: [gfriloux/dragonsword-save-editor — Content IDs & Paks](https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs).

## Export workflow (offline, on your machine)

1. Extract the two XML files with a CUE4Parse-based tool (FModel or a small headless extractor). The paks use a custom footer; stock `UnrealPak` may fail.
2. Parse `GameItemData.xml` + `StringData.xml` and emit **derived** JSON arrays:
   - `currencies.json` — `{ itemCid, name: { zh, en } }[]` for `tb_currency` CIDs (`1000xxx`)
   - `characters.json` — `{ characterCid, name, earnable? }[]` for playable characters (`10xxx`)
   - `recipes.json` — `{ switchKey, dishCid?, name }[]` for cooking recipes
   - `titles.json` — `{ titleId, name }[]` for account titles (`210xxxx`, unlock bits)
3. Copy the generated files into `src/games/dragon-sword/catalog/`. Keep arrays sorted by id for stable diffs.
4. Run `npm test` and `npm run typecheck`.

## UI fallback

`catalogLabel(cid)` returns a localized name when the CID appears in any catalog file; otherwise `#CID`.

## Legal

Names and ids are game content © their respective owners. Use exports for personal offline editing only.
