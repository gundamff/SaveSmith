# 恶魔城：贝尔蒙特的诅咒（Castlevania: Belmont's Curse）

[**中文**](belmonts-curse.md) | [English](belmonts-curse.en.md)

非官方存档修改说明。权利人：**KONAMI**（Steam AppID [4231820](https://store.steampowered.com/app/4231820/)）。与官方无关联。模块封面取自 Steam 商店头图，版权归 KONAMI。

> **当前范围：** 编辑槽位档 `BuildSave_*.sav` 中 `playerSave` 的**角色标量**与**背包 / 装备**（名称表就绪时）；能力 / Arcana、探索仍为只读。不读写 `PLAYERPREFS.sav`。不双写 `worldSaves` 拾取状态。

设计说明：[2026-10-19](../design/2026-10-19-belmonts-curse-design.md) · [背包](../design/2026-10-26-belmonts-curse-inventory-design.md)

## 存档位置

默认（Windows）：

`%USERPROFILE%\AppData\LocalLow\KONAMI\Castlevania Belmont's Curse`

槽位文件：`BuildSave_0.sav`、`BuildSave_1.sav` …（通常约 4 槽）。SaveSmith **只列出并编辑**匹配 `BuildSave_*.sav` 的槽位。

同目录还有 `PLAYERPREFS.sav`（偏好与 DLC 相关键）、`steam_autocloud.vdf` 等——**本模块不会识别为可编辑槽，也不会写入这些文件**。

## 格式说明

- 单行 UTF-8 **JSON**，顶层常见键：`version`、`playerSave`、`worldSaves`、`progressionBoardSave` 等。
- **无** checksum / HMAC；SaveSmith 对未知键整树**透传**，仅改白名单标量。
- 保存时 `JSON.stringify` 可能导致空白或键序与原文件不同；以**游戏能正常载入**为准（见 [HANDTEST](../HANDTEST.md)）。

Steam Cloud 会同步该目录下的 `*.sav`（配额约 40 MiB）。改档前请**完全退出游戏**，并建议暂时**关闭 Steam 云同步**，以免云端旧档覆盖本地修改。

## 可编辑内容（SaveSmith 现状）

| 标签 | 模式 | 内容 |
|------|------|------|
| 概览 | 只读摘要 | `version`、`saveDate`、`playTimeInSeconds` 等 |
| 角色 | **可写** | 见下表白名单 |
| 背包 | **可写**（名称表就绪） | 增删 `itemsInInventory`（去重）；改武器 / 法术 / 皮肤 / 护符（须已在背包；护符可空） |
| 能力 / Arcana | 只读 | `vaniaMoves`、`progressionPersistentSave`、Arcana 相关列表摘要 |
| 探索 | 只读 | 世界条目数、`currentCompletionItemCount`、实体状态计数（不逐实体编辑） |

### 角色标量白名单（`playerSave`）

| 字段 | 约束 |
|------|------|
| `level` | 整数 ≥ 1 |
| `experienceCurrent` | 整数 ≥ 0 |
| `healthUpgradeFragmentCount` | 整数 ≥ 0 |
| `manaUpgradeFragmentCount` | 整数 ≥ 0 |
| `atkBonusUpgradeCount` | 整数 ≥ 0 |
| `defBonusUpgradeCount` | 整数 ≥ 0 |
| `currentTheHermitDeathDefianceCount` | 整数 ≥ 0 |

以下字段仍会显示，但**不可编辑**（改了也无效）：`currentHealth`、`currentMana`、`currentHealChargesCount`。  
原因：从**生命之镜（Mirror of Life）**继续游戏时，游戏会回满生命 / 魔力并补满治疗次数；存档里的「当前值」在正常读档路径上会被覆盖。等级、经验、升级碎片等是持久进度，因此能生效。若要更高生命/魔力**上限**，请改对应升级碎片，而不是当前值。

其余键（含 `worldSaves`、`progressionBoardSave` 等）保存时**原样透传**。**不会**同步世界拾取状态：用编辑器添加的物品，仍可能在原获取点被再次捡到。

保存前自动备份（每文件最近 10 份），可在备份面板还原。

## 使用注意

1. 修改前**完全退出游戏**（退出时可能覆写 `BuildSave_*.sav`）。
2. 建议在 Steam 属性里**关闭该游戏的云存档**，改完确认无误后再按需打开。
3. 首次请用存档**副本**试验；不要用唯一真档做第一次保存。
4. 「生命之镜」读档会回满生命 / 魔力 / 治疗次数，改这些当前值通常无持久效果；请改升级碎片等持久字段。
5. 仅供已购买正版的玩家在**本地、单机**环境学习研究；请勿用于联机或传播已修改存档。
6. 游戏大版本更新后若 `version` 或 JSON 结构变化，可能出现警告或无法写回，以当前模块与 [CHANGELOG](../../CHANGELOG.md) 为准。

## 开发者

- 模块代码：`src/games/belmonts-curse/`
- 名称表：`py -3 scripts/bc_extract_names.py --game "<安装根>"`（需 UnityPy）
- 自动化：`npx vitest run tests/belmonts-curse`

返回 [README](../../README.md)。
