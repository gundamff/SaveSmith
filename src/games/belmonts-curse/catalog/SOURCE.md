# Belmont's Curse catalog provenance

Derived from a local PC install via `scripts/bc_extract_names.py` (UnityPy). **No icons.**

## Install fingerprint

- Publisher: `KONAMI`
- Product: `Castlevania Belmont's Curse`
- Addressables `m_BuildResultHash`: `b3868ffbfc1d75f198c0deb58aa55087`
- Entries written: **139**
- Categories: `{"charm": 46, "clue": 40, "key": 5, "other": 1, "skin": 7, "spell": 7, "weapon": 33}`
- Prefix gate: Weapon*=True Charm_*=True Skin_*=True

## Regenerate

```text
py -3 scripts/bc_extract_names.py --game "F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse"
```

Requires: `pip install UnityPy`

## Notes

- Shipped bundles do **not** expose SharedTableData `m_Entries` to UnityPy.
- Keys are save `itemID` strings from ItemData MonoBehaviours.
- `category` from ItemData `itemType` (1 weapon, 2 spell, 3 charm, 5 clue, 6 key, 7 skin).
- Display names: `itemDisplayName.m_KeyId` joined to `Items_*_en` / `Items_*_zh-cn` (fallback `zh-tw`) `m_TableData`.
- This install: en=569 zh-cn=0 zh-tw=569 keyed entries.
- UI policy B: add-list only `weapon|spell|charm|skin` (clue/key hidden from add).
