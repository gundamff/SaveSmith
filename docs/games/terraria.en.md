# Terraria

[中文](terraria.md) | **English**

Unofficial save editing notes. Rights holder: **Re-Logic** (Steam AppID [105600](https://store.steampowered.com/app/105600/)). Not affiliated with the official game.

> v1 supports **vanilla player** `.plr` only (no world `.wld`, no tModLoader guarantee).

## Save location

Default (Windows; uses the Documents known folder, including redirections):

`%DOCUMENTS%\My Games\Terraria`

Fallback: `%USERPROFILE%\Documents\My Games\Terraria`.

Slots: `Players/*.plr` (ignores `.plr.bak` and `.map` folders).

## Editable content

| Tab | Content |
|------|------|
| Character | Name, difficulty, life/mana, platinum/gold/silver/copper (coin slots) |
| Inventory | Hotbar, main inventory, armor/vanity/accessories; searchable catalog or raw ID |

Renaming in-file does **not** rename the `.plr` file (keeps map folder links).

Auto-backup before save (last 10 per file); restore from the backup panel.

## Notes

1. **Quit the game** completely before editing.
2. First try on a **copy** of your saves.
3. Extreme life/stacks may be clamped in-game.
4. Item name table is a common subset; use numeric IDs when needed.

Back to [README](../../README.en.md).
