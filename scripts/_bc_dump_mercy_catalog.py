#!/usr/bin/env python3
"""Dump Works of Mercy task/talent GUID catalog → worktree catalog/mercy.json."""
from __future__ import annotations

import json
from pathlib import Path

import UnityPy

bundle_dir = Path(
    r"F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse"
    r"\Castlevania Belmont's Curse_Data\StreamingAssets\aa\StandaloneWindows64"
)
REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "src" / "games" / "belmonts-curse" / "catalog" / "mercy.json"


def main() -> None:
    tasks: dict[str, dict] = {}
    talents: dict[str, dict] = {}

    for bp in bundle_dir.glob("*.bundle"):
        raw = bp.read_bytes()
        if not (
            b"linkedArcanaID" in raw
            or b"_guid" in raw
            and (b"Task" in raw or b"Talent" in raw or b"Arcana" in raw)
        ):
            if b"TaskTalent" not in raw and b"CurseFireBall_Task" not in raw and b"_Task_" not in raw:
                # still try arcanaNumber bundles (group containers)
                if b"linkedArcanaID" not in raw:
                    continue
        try:
            env = UnityPy.load(str(bp))
        except Exception:
            continue
        for obj in env.objects:
            if obj.type.name != "MonoBehaviour":
                continue
            try:
                d = obj.read_typetree()
            except Exception:
                continue
            if not isinstance(d, dict):
                continue
            name = str(d.get("m_Name") or "")
            guid = d.get("_guid")
            if not isinstance(guid, str) or len(guid) < 16:
                continue
            # Task assets
            is_task = (
                "_Task_" in name
                or name.endswith("_Task")
                or ("Task" in name and "Talent" not in name and "TaskTalentGroup" not in name and "linkedArcanaID" in d)
            )
            is_talent = "_Talent_" in name or (name.endswith("_Talent") and "Task" not in name)
            if "TaskTalentGroup" in name or name.endswith("_TaskTalentGroup"):
                continue
            if "Tuto_" in name:
                continue
            if "KeyEvent" in name:
                continue
            if name.endswith("Duration_ID") or name.endswith("_TaskDuration_ID"):
                continue
            linked = d.get("linkedArcanaID")
            char_path = None
            if isinstance(linked, dict):
                char_path = linked.get("m_PathID")
            row = {"guid": guid, "name": name, "characterPath": char_path}
            if is_talent:
                talents[guid] = row
            elif is_task or ("_Task" in name and "Talent" not in name):
                tasks[guid] = row

    # Also: any MB with linkedArcanaID + _guid whose name suggests task/talent
    task_list = sorted(tasks.values(), key=lambda x: x["name"])
    talent_list = sorted(talents.values(), key=lambda x: x["name"])
    payload = {
        "tasks": [{"guid": t["guid"], "name": t["name"], "en": t["name"], "zh": ""} for t in task_list],
        "talents": [{"guid": t["guid"], "name": t["name"], "en": t["name"], "zh": ""} for t in talent_list],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} tasks={len(task_list)} talents={len(talent_list)}")
    for t in task_list:
        print("T", t["guid"][:8], t["name"])
    for t in talent_list:
        print("L", t["guid"][:8], t["name"])


if __name__ == "__main__":
    main()
