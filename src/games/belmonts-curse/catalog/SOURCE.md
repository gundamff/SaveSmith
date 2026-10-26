# Belmont's Curse catalog provenance

Human-readable item / ability / charm labels for the save editor (`items.json`) are **derived from a local PC install** of *Castlevania: Belmont's Curse* (KONAMI). They are **not** shipped with SaveSmith and are **not** checked into the repo until you run the extractor on your machine.

## What is included

- `items.json`: map of save JSON string IDs → `{ "en", "zh" }` (see `names.ts`).
- **No icons**, sprites, or other game art (copyright + size).

## How to regenerate

From the repository root:

```text
npx tsx scripts/bc-extract-names.mts --game "F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse"
```

(`--game` may point at the install root or the `*_Data` folder.)

The script reads `app.info`, `StreamingAssets/aa/catalog.json`, and counts Addressables bundles under `StandaloneWindows64`. It writes `src/games/belmonts-curse/catalog/items.json`.

## Current limitation (phase 1)

Save IDs in `BuildSave_*.sav` are opaque strings. Display names live in **Unity Localization** `StringTableCollections` (e.g. `Items_Charms_en`, `Items_Weapons_zh-cn`) referenced from **Addressables** asset bundles. Those tables are stored inside compressed `.bundle` files, not as plain text in `resources.assets`.

Until a bundle/text extraction step is added (or names are sourced from another community tool with compatible IDs), **`items.json` may remain `{}`**. That is an explicit, acceptable outcome: the inventory UI still shows **raw IDs** via `lookupItemName` fallback.

## Chinese (`zh`)

When extraction works, prefer `Items_*_zh-cn` (or `zh-tw`) tables; until then `zh` may equal `en` or stay empty and fall back to `en` / raw ID in the UI.

## Version pinning

Record the install you used when generating a non-empty catalog:

- Publisher / product from `<Game>_Data/app.info`
- Addressables `m_BuildResultHash` from `StreamingAssets/aa/catalog.json` (printed by the extract script)

Re-run the script after game patches if names drift.
