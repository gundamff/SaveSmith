# Wanderburg 恢复解锁 Tab

日期：2026-09-09  
状态：已确认（用户：恢复解锁 tab）  
依据：全量表 `.tools/wb-unlock-catalog.json` + [wanderburg-unlock-catalog.md](../../wanderburg-unlock-catalog.md)

## 目标

恢复「解锁」Tab：按 **catalog 全量** 勾选，读写存档 `unlockedIDs`。

## 方案（选定）

嵌入精简 catalog（`id` / `typeName` / `nameEn` / `nameZh` / `price`）到 `src/games/wanderburg/data/unlock-catalog.json`。  
中文来自游戏 `LocaTest_zh`（key=英文名）；缺译回退英文。UI 按类型分组 + 全解/清空；未知 ID 保留。

## 非目标

图标、biome 解锁、`unlockedAndNew` 编辑、跟随游戏内其它语种（仅跟 SaveSmith 中/英）。
