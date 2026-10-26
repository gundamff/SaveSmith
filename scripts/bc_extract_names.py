#!/usr/bin/env python3
"""Extract Belmont's Curse item display names from Addressables bundles (UnityPy).

Join path (SharedTableData m_Entries is not present in shipped bundles):
  ItemData MonoBehaviour.itemID + itemDisplayName.m_KeyId
  × Items_*_en / Items_*_zh-cn StringTable m_Id → m_Localized

Usage:
  py -3 scripts/bc_extract_names.py --game "F:\\SteamLibrary\\steamapps\\common\\Castlevania Belmont's Curse"

Writes: src/games/belmonts-curse/catalog/items.json
Requires: pip install UnityPy
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import UnityPy
except ImportError:
    print("UnityPy required: pip install UnityPy", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "src" / "games" / "belmonts-curse" / "catalog" / "items.json"
SOURCE = REPO / "src" / "games" / "belmonts-curse" / "catalog" / "SOURCE.md"

# zh-cn may be remote-only on some installs; zh-tw is often local and used as zh fallback.
ITEM_TABLE_RE = re.compile(r"^Items_[A-Za-z0-9]+_(en|zh-cn|zh-tw)$")

# Unity ItemData.itemType enum (observed on PC build).
ITEM_TYPE_TO_CATEGORY = {
    1: "weapon",
    2: "spell",
    3: "charm",
    4: "other",
    5: "clue",
    6: "key",
    7: "skin",
}


def category_from_item_type(item_type) -> str:
    try:
        n = int(item_type)
    except (TypeError, ValueError):
        return "other"
    return ITEM_TYPE_TO_CATEGORY.get(n, "other")


def category_from_id_prefix(iid: str) -> str:
    if iid.startswith("Weapon"):
        return "weapon"
    if iid.startswith("Charm_"):
        return "charm"
    if iid.startswith("Skin_"):
        return "skin"
    if iid.startswith("Clue_"):
        return "clue"
    return "other"


def resolve_data_dir(game: Path) -> Path:
    game = game.resolve()
    if not game.exists():
        raise SystemExit(f"game path not found: {game}")
    if game.name.endswith("_Data"):
        return game
    for child in game.iterdir():
        if child.is_dir() and child.name.endswith("_Data"):
            return child
    raise SystemExit(f"no *_Data under {game}")


def read_app_info(data_dir: Path) -> tuple[str, str]:
    p = data_dir / "app.info"
    if not p.exists():
        return "", ""
    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    return (lines[0].strip() if lines else ""), (lines[1].strip() if len(lines) > 1 else "")


def read_build_hash(aa: Path) -> str:
    cat = aa / "catalog.json"
    if not cat.exists():
        return ""
    try:
        return str(json.loads(cat.read_text(encoding="utf-8")).get("m_BuildResultHash", ""))
    except Exception:
        return ""


def typetree(obj) -> dict | None:
    try:
        tree = obj.read_typetree()
        return tree if isinstance(tree, dict) else None
    except Exception:
        return None


def extract_localized(tree: dict) -> dict[int, str]:
    out: dict[int, str] = {}
    rows = tree.get("m_TableData") or []
    if not isinstance(rows, list):
        return out
    for row in rows:
        if not isinstance(row, dict):
            continue
        eid = row.get("m_Id")
        text = row.get("m_Localized")
        if eid is None or text is None:
            continue
        try:
            eid_i = int(eid)
        except (TypeError, ValueError):
            continue
        s = str(text).strip()
        if not s:
            continue
        if eid_i not in out:
            out[eid_i] = s
    return out


def key_id_from_localized_string(field) -> int | None:
    """Unity LocalizedString → m_TableEntryReference.m_KeyId."""
    if not isinstance(field, dict):
        return None
    ref = field.get("m_TableEntryReference")
    if not isinstance(ref, dict):
        return None
    kid = ref.get("m_KeyId")
    if kid is None:
        return None
    try:
        n = int(kid)
    except (TypeError, ValueError):
        return None
    return n if n != 0 else None


def extract_item_meta(tree: dict) -> tuple[str, int, str] | None:
    """itemID, localization KeyId (0 if none), category."""
    iid = tree.get("itemID")
    if not isinstance(iid, str) or not iid.strip():
        return None
    iid = iid.strip()
    kid = key_id_from_localized_string(tree.get("itemDisplayName")) or 0
    if "itemType" in tree:
        cat = category_from_item_type(tree.get("itemType"))
    else:
        cat = category_from_id_prefix(iid)
    return iid, kid, cat


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", required=True, help="Install root or *_Data folder")
    args = ap.parse_args()
    data_dir = resolve_data_dir(Path(args.game))
    aa = data_dir / "StreamingAssets" / "aa"
    bundle_dir = aa / "StandaloneWindows64"
    if not bundle_dir.is_dir():
        print(f"missing bundles: {bundle_dir}", file=sys.stderr)
        OUT.write_text("{}\n", encoding="utf-8")
        return 1

    publisher, product = read_app_info(data_dir)
    build_hash = read_build_hash(aa)

    # itemID -> (keyId, category)
    id_meta: dict[str, tuple[int, str]] = {}
    en_by_id: dict[int, str] = {}
    zh_cn_by_id: dict[int, str] = {}
    zh_tw_by_id: dict[int, str] = {}

    bundles = list(bundle_dir.glob("*.bundle"))
    print(f"scanning {len(bundles)} bundles…", flush=True)
    for i, bp in enumerate(bundles):
        if i and i % 500 == 0:
            print(f"  …{i}/{len(bundles)}", flush=True)
        raw = bp.read_bytes()
        # Fast reject: most bundles have neither item data nor Items_ string tables
        if b"itemID" not in raw and b"Items_" not in raw:
            continue
        try:
            env = UnityPy.load(str(bp))
        except Exception:
            continue
        for obj in env.objects:
            if obj.type.name != "MonoBehaviour":
                continue
            tree = typetree(obj)
            if not tree:
                continue
            name = str(tree.get("m_Name") or "")

            if "itemID" in tree:
                meta = extract_item_meta(tree)
                if meta:
                    iid, kid, cat = meta
                    prev = id_meta.get(iid)
                    if prev is None or (prev[0] == 0 and kid != 0):
                        id_meta[iid] = (kid, cat)
                    elif prev is not None and prev[1] == "other" and cat != "other":
                        id_meta[iid] = (prev[0] or kid, cat)
                continue

            if not ITEM_TABLE_RE.match(name):
                continue
            loc = tree.get("m_LocaleId") or {}
            code = ""
            if isinstance(loc, dict):
                code = str(loc.get("m_Code") or "")
            localized = extract_localized(tree)
            if name.endswith("_en") or code == "en":
                en_by_id.update(localized)
            elif name.endswith("_zh-cn") or code == "zh-cn":
                zh_cn_by_id.update(localized)
            elif name.endswith("_zh-tw") or code == "zh-tw":
                zh_tw_by_id.update(localized)

    items: dict[str, dict[str, str]] = {}
    cat_counts: dict[str, int] = {}
    for iid, (kid, cat) in sorted(id_meta.items()):
        en = en_by_id.get(kid, "") if kid else ""
        zh = ""
        if kid:
            zh = zh_cn_by_id.get(kid, "") or zh_tw_by_id.get(kid, "")
        if not en and not zh:
            # Still catalog the ID so add-item UI can offer it; UI falls back to id
            items[iid] = {"en": iid, "zh": "", "category": cat}
        else:
            items[iid] = {"en": en or zh, "zh": zh, "category": cat}
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    n = len(items)
    has_w = any(k.startswith("Weapon") for k in items)
    has_c = any(k.startswith("Charm_") for k in items)
    has_s = any(k.startswith("Skin_") for k in items)

    source = f"""# Belmont's Curse catalog provenance

Derived from a local PC install via `scripts/bc_extract_names.py` (UnityPy). **No icons.**

## Install fingerprint

- Publisher: `{publisher}`
- Product: `{product}`
- Addressables `m_BuildResultHash`: `{build_hash}`
- Entries written: **{n}**
- Categories: `{json.dumps(cat_counts, sort_keys=True)}`
- Prefix gate: Weapon*={has_w} Charm_*={has_c} Skin_*={has_s}

## Regenerate

```text
py -3 scripts/bc_extract_names.py --game "F:\\SteamLibrary\\steamapps\\common\\Castlevania Belmont's Curse"
```

Requires: `pip install UnityPy`

## Notes

- Shipped bundles do **not** expose SharedTableData `m_Entries` to UnityPy.
- Keys are save `itemID` strings from ItemData MonoBehaviours.
- `category` from ItemData `itemType` (1 weapon, 2 spell, 3 charm, 5 clue, 6 key, 7 skin).
- Display names: `itemDisplayName.m_KeyId` joined to `Items_*_en` / `Items_*_zh-cn` (fallback `zh-tw`) `m_TableData`.
- This install: en={len(en_by_id)} zh-cn={len(zh_cn_by_id)} zh-tw={len(zh_tw_by_id)} keyed entries.
- UI policy B: add-list only `weapon|spell|charm|skin` (clue/key hidden from add).
"""
    SOURCE.write_text(source, encoding="utf-8")
    print(
        f"wrote {OUT} entries={n} itemIDs={len(id_meta)} "
        f"enIds={len(en_by_id)} zhCn={len(zh_cn_by_id)} zhTw={len(zh_tw_by_id)}"
    )
    print(f"categories {cat_counts}")
    print(f"prefix gate Weapon={has_w} Charm_={has_c} Skin_={has_s}")
    if n < 50 or not (has_w and has_c and has_s):
        print("WARNING: catalogReady gate may stay false", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
