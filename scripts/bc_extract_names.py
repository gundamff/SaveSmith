#!/usr/bin/env python3
"""Extract Belmont's Curse item + Arcana catalogs from Addressables bundles (UnityPy).

Join path (SharedTableData m_Entries is not present in shipped bundles):
  ItemData MonoBehaviour.itemID + itemDisplayName.m_KeyId
  × Items_*_en / Items_*_zh-cn StringTable m_Id → m_Localized

Also emits arcana.json from CodexData + CharacterID_* + TaskTalentGroup spell hints
+ *VaniaMoveID guids.

Usage:
  py -3 scripts/bc_extract_names.py --game "F:\\SteamLibrary\\steamapps\\common\\Castlevania Belmont's Curse"

Writes:
  src/games/belmonts-curse/catalog/items.json
  src/games/belmonts-curse/catalog/arcana.json
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
OUT_ITEMS = REPO / "src" / "games" / "belmonts-curse" / "catalog" / "items.json"
OUT_ARCANA = REPO / "src" / "games" / "belmonts-curse" / "catalog" / "arcana.json"
SOURCE = REPO / "src" / "games" / "belmonts-curse" / "catalog" / "SOURCE.md"

ITEM_TABLE_RE = re.compile(r"^Items_[A-Za-z0-9]+_(en|zh-cn|zh-tw)$")

ITEM_TYPE_TO_CATEGORY = {
    1: "weapon",
    2: "spell",
    3: "charm",
    4: "other",
    5: "clue",
    6: "key",
    7: "skin",
}

# Codex asset name → CharacterID_* suffix (save key for characterProgressionSteps).
CODEX_TO_CHAR = {
    "Doppelganger_CodexData": "Doppelganger",
    "Leon_CodexData": "Leon",
    "JoanArc_CodexData": "Joan",
    "Medusa_CodexData": "Medusa",
    "Talos_CodexData": "Talos",
    "Brauner_CodexData": "Brauner",
    "Carmilla_CodexData": "Carmilla",
    "Death_CodexData": "Death",
    "Mammon_CodexData": "Mammon",
    "Ferryman_CodexData": "Ferryman",
    "Isaac_CodexData": "Isaac",
    "Succubus_CodexData": "Succubus",
    "Arthur_CodexData": "Arthur",
    "SaintLouis_CodexData": "StLouis",
    "Eleanor_CodexData": "Eleanor",
}

# TaskTalentGroup stem → inventory itemID when SpellData PPtr resolve fails.
GROUP_SPELL_ITEM_ID = {
    "MassPurification": "RageIncarnation",
    "BoomerangCross": "BoomerangCross",
    "FireSeismicWave": "FireSeismicWave",
    "PetrifyingRay": "PetrifyingRay",
    "GiantFist": "GiantFist",
    "InvocationStone": "InvocationStone",
    "BloodSpikes": "BloodSpikes",
    "LaserScytheSlash": "LaserScytheSlash",
    "TargetingChargingWheel": "TargetingChargingWheel",
    "FreezingMist": "FreezingMist",
    "HangedMan": "RiseAndFall",
    "LifeDrain": "LifeDrain",
    "GlassArmor": "GlassArmor",
    "Detainment": "Detainment",
    "PocketMirror": "PocketMirror",
    "RiseAndFall": "RiseAndFall",
    "CursedFireBall": "CursedFireBall",
}

# characterKey → spell itemID (observed TaskTalentGroup ↔ CharacterID mapping).
FALLBACK_SPELL_BY_CHAR = {
    "Doppelganger": "RageIncarnation",
    "Leon": "BoomerangCross",
    "Joan": "FireSeismicWave",
    "Medusa": "PetrifyingRay",
    "Talos": "GiantFist",
    "Brauner": "InvocationStone",
    "Carmilla": "BloodSpikes",
    "Death": "LaserScytheSlash",
    "Mammon": "TargetingChargingWheel",
    "Ferryman": "FreezingMist",
    "Isaac": "RiseAndFall",
    "Succubus": "LifeDrain",
    "Arthur": "GlassArmor",
    "StLouis": "Detainment",
    "Eleanor": "PocketMirror",
}

# characterKey → VaniaMoveID stem (when Codex PPtr name is ItemData without _guid).
FALLBACK_VANIA_STEM_BY_CHAR = {
    "Leon": "Whip",
    "Joan": "VaniaLight",
    "Talos": "Stomp",
    "Brauner": "AerialDash",
    "Death": "DoubleJump",
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


def truthy_flag(v) -> bool:
    if v is True or v == 1 or v == "1":
        return True
    return False


def bundle_worth_scanning(raw: bytes) -> bool:
    """ASCII prefilter. Do NOT require literal 'itemID' — many WeaponData bundles omit it.

    Asset *names* (Doppelganger_CodexData, Stomp_VaniaMoveID, …) are often stripped from
    serialized bytes; field names like arcanaNumber / VaniaMove still appear.
    """
    needles = (
        b"itemID",
        b"Items_",
        b"itemType",
        b"Weapon",
        b"Charm_",
        b"Skin_",
        b"SpellData",
        b"Clue_",
        b"CharacterID_",
        b"TaskTalentGroup",
        b"arcanaNumber",
        b"arcanaSpell",
        b"VaniaMove",
        b"abstractItem",
        # Spell itemID values that may lack a surrounding SpellData name in raw:
        b"BloodSpikes",
        b"LifeDrain",
        b"InvocationStone",
        b"FreezingMist",
        b"Detainment",
        b"TargetingCharging",
        b"RageIncarnation",
        b"CursedFireBall",
        b"DoubleJump",
        b"FreezingMist",
        b"Detainment",
    )
    return any(n in raw for n in needles)


def extract_item_meta(tree: dict) -> tuple[str, int, str, bool, bool] | None:
    """itemID, keyId, category, abstract, deprecated."""
    iid = tree.get("itemID")
    if not isinstance(iid, str) or not iid.strip():
        return None
    iid = iid.strip()
    kid = key_id_from_localized_string(tree.get("itemDisplayName")) or 0
    if "itemType" in tree:
        cat = category_from_item_type(tree.get("itemType"))
    else:
        cat = category_from_id_prefix(iid)
    abstract = truthy_flag(tree.get("abstractItem"))
    deprecated = truthy_flag(tree.get("isDeprecated"))
    return iid, kid, cat, abstract, deprecated


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", required=True, help="Install root or *_Data folder")
    args = ap.parse_args()
    data_dir = resolve_data_dir(Path(args.game))
    aa = data_dir / "StreamingAssets" / "aa"
    bundle_dir = aa / "StandaloneWindows64"
    if not bundle_dir.is_dir():
        print(f"missing bundles: {bundle_dir}", file=sys.stderr)
        OUT_ITEMS.write_text("{}\n", encoding="utf-8")
        OUT_ARCANA.write_text("[]\n", encoding="utf-8")
        return 1

    publisher, product = read_app_info(data_dir)
    build_hash = read_build_hash(aa)

    # itemID -> (keyId, category, abstract, deprecated)
    id_meta: dict[str, tuple[int, str, bool, bool]] = {}
    en_by_id: dict[int, str] = {}
    zh_cn_by_id: dict[int, str] = {}
    zh_tw_by_id: dict[int, str] = {}

    char_guid_by_key: dict[str, str] = {}
    codices: list[dict] = []
    # character PathID → spell itemIDs
    spells_by_char_path: dict[int, list[str]] = {}
    # TaskTalentGroup: char PathID → group stem
    group_by_char_path: dict[int, str] = {}
    # path_id → resolved itemID / guid / name
    by_path: dict[int, list[dict]] = {}
    vania_guid_by_stem: dict[str, str] = {}

    bundles = list(bundle_dir.glob("*.bundle"))
    print(f"scanning {len(bundles)} bundles…", flush=True)
    for i, bp in enumerate(bundles):
        if i and i % 500 == 0:
            print(f"  …{i}/{len(bundles)}", flush=True)
        raw = bp.read_bytes()
        if not bundle_worth_scanning(raw):
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
            pid = int(obj.path_id)
            by_path.setdefault(pid, []).append(
                {
                    "name": name,
                    "itemID": tree.get("itemID"),
                    "_guid": tree.get("_guid"),
                }
            )

            if "itemID" in tree:
                meta = extract_item_meta(tree)
                if meta:
                    iid, kid, cat, abstract, deprecated = meta
                    prev = id_meta.get(iid)
                    if prev is None or (prev[0] == 0 and kid != 0):
                        id_meta[iid] = (kid, cat, abstract, deprecated)
                    elif prev is not None and prev[1] == "other" and cat != "other":
                        id_meta[iid] = (prev[0] or kid, cat, abstract or prev[2], deprecated or prev[3])
                    else:
                        # merge flags
                        id_meta[iid] = (
                            prev[0],
                            prev[1],
                            abstract or prev[2],
                            deprecated or prev[3],
                        )
                # Spell → character path
                if "arcanaCharacterID" in tree and isinstance(tree.get("itemID"), str):
                    cref = tree.get("arcanaCharacterID") or {}
                    cpid = cref.get("m_PathID")
                    if cpid:
                        spells_by_char_path.setdefault(int(cpid), []).append(tree["itemID"].strip())

            if name.startswith("CharacterID_") and isinstance(tree.get("_guid"), str):
                char_guid_by_key[name.removeprefix("CharacterID_")] = tree["_guid"]

            # Codex rows: prefer named *_CodexData; also accept typetree with arcanaNumber
            # when m_Name was stripped but fields remain.
            if name in CODEX_TO_CHAR or (
                "arcanaNumber" in tree
                and "characterID" in tree
                and "arcanaSpell" in tree
                and name.endswith("_CodexData")
            ):
                if name in CODEX_TO_CHAR or name.endswith("_CodexData"):
                    codices.append(
                        {
                            "codex": name if name in CODEX_TO_CHAR else name,
                            "arcanaNumber": tree.get("arcanaNumber"),
                            "characterPath": (tree.get("characterID") or {}).get("m_PathID"),
                            "spellPath": (tree.get("arcanaSpell") or {}).get("m_PathID"),
                            "vaniaPath": (tree.get("arcanaVaniaMove") or {}).get("m_PathID"),
                        }
                    )

            if name.endswith("_TaskTalentGroup") or (
                "linkedArcanaID" in tree and "arcanaNumber" in tree and name.endswith("Group")
            ):
                href = tree.get("linkedArcanaID") or {}
                cpid = href.get("m_PathID")
                if cpid:
                    stem = name.removesuffix("_TaskTalentGroup") if name.endswith("_TaskTalentGroup") else name
                    if stem:
                        group_by_char_path[int(cpid)] = stem

            if name.endswith("_VaniaMoveID") and isinstance(tree.get("_guid"), str):
                stem = name.removesuffix("_VaniaMoveID")
                vania_guid_by_stem[stem] = tree["_guid"]

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

    def resolve_item_id(path_id) -> str:
        if not path_id:
            return ""
        for row in by_path.get(int(path_id)) or []:
            iid = row.get("itemID")
            if isinstance(iid, str) and iid.strip():
                return iid.strip()
        return ""

    def resolve_vania_guid(path_id) -> str:
        if not path_id:
            return ""
        for row in by_path.get(int(path_id)) or []:
            g = row.get("_guid")
            if isinstance(g, str) and g:
                return g
            n = str(row.get("name") or "")
            if n.endswith("_VaniaMoveID"):
                stem = n.removesuffix("_VaniaMoveID")
                if stem in vania_guid_by_stem:
                    return vania_guid_by_stem[stem]
            # ItemData named Whip_ItemData etc. — map via stem heuristics
            for stem, guid in vania_guid_by_stem.items():
                if stem and stem in n:
                    return guid
        return ""

    items: dict[str, dict] = {}
    cat_counts: dict[str, int] = {}
    for iid, (kid, cat, abstract, deprecated) in sorted(id_meta.items()):
        en = en_by_id.get(kid, "") if kid else ""
        zh = ""
        if kid:
            zh = zh_cn_by_id.get(kid, "") or zh_tw_by_id.get(kid, "")
        row: dict = {
            "en": en or zh or iid,
            "zh": zh,
            "category": cat,
        }
        if abstract:
            row["abstract"] = True
        if deprecated:
            row["deprecated"] = True
        items[iid] = row
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    OUT_ITEMS.parent.mkdir(parents=True, exist_ok=True)
    OUT_ITEMS.write_text(json.dumps(items, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    # --- Arcana catalog ---
    known_item_ids = set(items.keys())
    arcana_rows: list[dict] = []
    for c in sorted(codices, key=lambda x: x.get("arcanaNumber") or 0):
        key = CODEX_TO_CHAR.get(c["codex"])
        if not key:
            continue
        guid = char_guid_by_key.get(key, "")
        if not guid:
            continue
        char_path = c.get("characterPath")
        spell_id = resolve_item_id(c.get("spellPath"))
        if not spell_id and char_path:
            cands = sorted({x for x in spells_by_char_path.get(int(char_path), []) if x})
            if cands:
                spell_id = cands[0]
        if not spell_id and char_path:
            stem = group_by_char_path.get(int(char_path), "")
            guess = GROUP_SPELL_ITEM_ID.get(stem, stem)
            if guess and (guess in known_item_ids or guess):
                spell_id = guess
        vania_guid = resolve_vania_guid(c.get("vaniaPath"))
        # Fallback: Codex vania ItemData name → VaniaMoveID stem
        if not vania_guid and c.get("vaniaPath"):
            for row in by_path.get(int(c["vaniaPath"])) or []:
                n = str(row.get("name") or "")
                for stem, vg in vania_guid_by_stem.items():
                    if stem and (n.startswith(stem) or stem in n):
                        vania_guid = vg
                        break
        if not spell_id:
            spell_id = FALLBACK_SPELL_BY_CHAR.get(key, "")
        if not vania_guid:
            stem = FALLBACK_VANIA_STEM_BY_CHAR.get(key, "")
            if stem:
                vania_guid = vania_guid_by_stem.get(stem, "")
        arcana_rows.append(
            {
                "characterGuid": guid,
                "characterKey": key,
                "arcanaNumber": int(c.get("arcanaNumber") or 0),
                "spellItemID": spell_id,
                "vaniaGuid": vania_guid,
                "en": key,
                "zh": "",
            }
        )

    # Stub missing spell itemIDs into items.json so inventory add-all can include them.
    for row in arcana_rows:
        sid = (row.get("spellItemID") or "").strip()
        if not sid or sid in items:
            continue
        items[sid] = {"en": sid, "zh": "", "category": "spell"}
        cat_counts["spell"] = cat_counts.get("spell", 0) + 1
        known_item_ids.add(sid)

    # Rewrite items after stubs
    OUT_ITEMS.write_text(json.dumps(items, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    OUT_ARCANA.write_text(
        json.dumps(arcana_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    n = len(items)
    has_w = any(k.startswith("Weapon") for k in items)
    has_c = any(k.startswith("Charm_") for k in items)
    has_s = any(k.startswith("Skin_") for k in items)
    abstract_n = sum(1 for v in items.values() if v.get("abstract"))
    addable_w = sum(
        1
        for k, v in items.items()
        if v.get("category") == "weapon"
        and not v.get("abstract")
        and not v.get("deprecated")
        and "Doppelganger" not in k
    )

    source = f"""# Belmont's Curse catalog provenance

Derived from a local PC install via `scripts/bc_extract_names.py` (UnityPy). **No icons.**

## Install fingerprint

- Publisher: `{publisher}`
- Product: `{product}`
- Addressables `m_BuildResultHash`: `{build_hash}`
- Entries written: **{n}** (abstract flagged: {abstract_n})
- Categories: `{json.dumps(cat_counts, sort_keys=True)}`
- Addable weapons (non-abstract, non-Doppelganger): **{addable_w}**
- Arcana rows: **{len(arcana_rows)}**
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
- `abstract` / `deprecated` from ItemData flags; add-list skips abstract, deprecated, `*Doppelganger*`.
- Fast bundle reject uses broad needles (Weapon/Charm_/SpellData/…) — **not** ASCII `itemID` alone.
- Display names: `itemDisplayName.m_KeyId` joined to `Items_*_en` / `Items_*_zh-cn` (fallback `zh-tw`) `m_TableData`.
- This install: en={len(en_by_id)} zh-cn={len(zh_cn_by_id)} zh-tw={len(zh_tw_by_id)} keyed entries.
- `arcana.json`: CharacterID GUID → spell / vania for `characterProgressionSteps` unlocks.
- UI policy B: add-list only `weapon|spell|charm|skin` (clue/key hidden from add).
"""
    SOURCE.write_text(source, encoding="utf-8")
    print(
        f"wrote {OUT_ITEMS} entries={n} itemIDs={len(id_meta)} "
        f"enIds={len(en_by_id)} zhCn={len(zh_cn_by_id)} zhTw={len(zh_tw_by_id)}"
    )
    print(f"categories {cat_counts} abstract={abstract_n} addableWeapons={addable_w}")
    print(f"wrote {OUT_ARCANA} arcana={len(arcana_rows)} vaniaStems={sorted(vania_guid_by_stem)}")
    print(f"prefix gate Weapon={has_w} Charm_={has_c} Skin_={has_s}")
    if n < 50 or not (has_w and has_c and has_s) or len(arcana_rows) < 10:
        print("WARNING: catalogReady / arcana gate may stay false", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
