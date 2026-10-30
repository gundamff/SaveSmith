# Phantom Blade Zero item catalog provenance

This catalog was derived from the local Steam build `26266538`
(`CL-301524_JKS-17219`) on 2026-10-30. It is not a transcription from a wiki
and does not derive display names from save IDs.

## Resource inputs

The following assets were mounted read-only from
`ProjectPBZ/Content/Paks/ProjectPBZ-Windows.utoc`:

- `/Game/PBZContent/DataTable/Item/DT_InventoryData`
- `/Game/PBZContent/DataTable/Item/DT_InitItem`
- `/Game/PBZContent/DataTable/UI/DT_UsableItem`
- `/Game/PBZContent/DataTable/UI/DT_ShopItemTable`
- `zh-Hans` localization resources
- `en` localization resources

The build-matched mapping was
`ProjectPBZ-5.7.4-301524-full.usmap` (SHA-256
`c7fb911bc24ec7a3c77fbf1cbe62c57bec1dcc8b621ea305ac9e50b4d9fb6651`).

Normalized CUE4Parse exports:

- `tables.zh-Hans.json`: SHA-256
  `a660910516b601c7f746bee03d4a8988a0bea5486ab8c64c2d2fc5f58e7173f8`
- `tables.en.json`: SHA-256
  `4f58ff6a8b738d0a30b5a431f112681c091a763496629af38af0a2d310b96cee`

Chinese names are resolved by localization namespace/key from the
`zh-Hans` resources. The build's `en` resources contain no translations for
these item-name keys, so catalog `en` is intentionally empty. English UI
therefore shows a readable ID form such as `Weapon Material 01` /
`Item Traversing` instead of inventing English game text or falling back to
Chinese.

`Player.Dust` is labeled 意识尘埃 in Chinese UI. The same `en` localization
pass found no Dust translation, so English UI keeps `Dust`.

## Selection and exclusions

The output contains 39 rows:

- 27 `Weapon_Material_*` rows whose resource classification is
  `ItemDetailType::Material` plus either
  `WeaponUpgradeMaterial` or `ShaChiWeaponUpgradeMaterial`
- 12 growth (`consumable` category) rows matching in-game 养成 materials:
  - black stone / killing-aura amber and their fragments (`Item_001`,
    `Item_002`, `Item_Piece_001`, `Item_Piece_002`) — flagged
    `thresholdRisk: true`
  - sha-qi core (`ShaqiHexin`)
  - core progression (`I_060002` 榕树之心)
  - accessory upgrade materials (`Ac_Material_1`, `Ac_Material_4`)
  - medicine upgrade materials (`Medi_Material_1`..`3`)
  - ordinary consumable `Item_Traversing` (穿行符)

Excluded: snap-soul materials, memory flowers, books, quest / narrative
placeholders, and weapon / sha-qi return tokens. Players may still hold those
IDs in saves; SaveSmith simply does not project or edit them.

`Item_Traversing` keeps the conservative application safety limit of `0..99`.
Other growth items and weapon materials use `0..9999`. Real-save `MaxAmount`
tracks per-record state rather than a stable item definition, so save values
are not copied into this static catalog.

## Real-save shape audit

The save under `Saved/SaveGames/Steam/<SteamID64>/PBZSaveGame.sav` was parsed
in memory through the existing PBZ module. The sample-free report recorded
identical five required fields on every observed inventory record:
`AcquiredCycle`, `CurrentAmount`, `DirtyTime`, `FirstAddTime`, and
`MaxAmount`. Amount/cycle fields were numbers and time fields were strings.
No IDs, names, values, timestamps, or save bytes were written to that report.

Deletion removes the inventory key from `Inventory.InventoryInfos` entirely
(same shape as never having owned the item).

## Regeneration

```powershell
$env:PBZ_EXPORT_DIR="$env:TEMP\pbz-item-export"
$env:PBZ_SAVE="F:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\PBZSaveGame.sav"
npx vite-node scripts/pbz-discover-item-assets.mts
node --experimental-strip-types scripts/pbz-build-item-catalog.mts
```

AES keys, USMAP bytes, raw game exports, player saves, player identifiers,
tool binaries, and temporary reports are not redistributed.
