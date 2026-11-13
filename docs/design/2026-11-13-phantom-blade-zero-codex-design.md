# 影之刃零：敌人图鉴编辑

状态：**已批准实现**（2026-11-13）  
依据：`2026-11-13-phantom-blade-zero-codex-research.md`；发现写入手测通过；揭示探针档已制备。

## 目标

玩家在 SaveSmith 内完整管理敌人图鉴：看清缺谁、搜索筛选、单条开关、一键点亮到「发现+揭示」齐套状态。改的是账号级 `__Advanced__.Codex`，不是周目槽。

## 玩家体验

- 独立 Tab「图鉴」（账号级；不依赖当前 Auto/Manual 槽）
- 进度：`已发现 a/177` · `已揭示 b/177`
- 搜索：中文名 / 行键 ID
- 筛选：全部 | 未发现 | 已发现未揭示 | 已完整；Boss | 普通
- 行：中文名、类型、地图、发现/揭示开关
- 批量：**点亮全部（发现+揭示）**（主操作）、仅发现、仅揭示、清除发现、清除揭示（危险确认）
- 风险条：账号槽、自动备份；不承诺成就/奖励副作用
- SoftObject 路径不对玩家展示

## 数据

| 存档 | 含义 |
|------|------|
| `__Advanced__.Codex.DiscoveredEnemies` | string[] SoftObject（表 `EnemyClass`） |
| `__Advanced__.Codex.RevealedEnemies` | string[] SoftObject |
| `EnemyKillMapIDs` | 一期只读透传，不编辑 |

目录：`catalog/codexEnemies.json`（177 行，来自 `DT_CodexEnemyDataTable`）。

## 非目标（本期）

- 特典画册/音乐（`BonusCollection`；UnlockTag 未展开）
- `Inventory.AllCodexID`、`DT_CodexData` 杂项
- 改 `BossRecord` / 成就灌水
- 运行时读 pak

## 架构

- `parse`：若 `__Advanced__` 为合法 JSON 则挂到 `model.advanced`；非法/缺失则 `null`（旧 fixture 的 opaque 字节保持兼容）
- `serialize`：仅当 `advanced.dirty` 时把整份 Advanced JSON 作为脏槽写回；其它 Advanced 键原样保留在 document 内
- `model/codex.ts`：投影与突变；路径必须在目录白名单
- `CodexTab.vue`：账号级 UI，无周目槽选择器

## 验收

- 单测：投影、开关、点亮全表、非法路径拒绝、opaque Advanced 不炸、脏写只动 Advanced
- 手测：发现（已过）；揭示探针 `76561198096595921-codex-reveal`（少年左殇）；点亮后进游戏图鉴完整
