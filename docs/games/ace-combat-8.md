# 皇牌空战 8：希孚之翼 / ACE COMBAT 8

[**中文**](ace-combat-8.md) | [English](ace-combat-8.en.md)

非官方存档修改说明。权利人：**Bandai Namco Entertainment**（Steam AppID [2288340](https://store.steampowered.com/app/2288340/)）。与官方无关联。模块封面取自 Steam 商店头图，版权归 Bandai Namco。

## 存档位置

默认（Windows）：

`%LOCALAPPDATA%\BANDAI NAMCO Entertainment\ACE COMBAT 8\Saved\SaveGames`

识别文件：`Campaign.sav`（UE5 GVAS / `LiveCampaignSaveGame`）。本模块只编辑战役档，不改 `System.sav` / Online / Replay。

写回时会按游戏公式重算 `Checksum`（`CRC32(PackedData, 种子 0x41916EBD)`），否则游戏会提示存档损坏。

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 资源 | 当前 MRP、累计 TotalMRP；可将累计同步为当前值 |
| 进度 / 周目 | 通关次数、最近完成 / 游玩任务 ID、功能旗标只读摘要；一键开启通关权限，或伪二周目（重置故事光标 + 保留机库/MRP + 通关权益） |

### 截图

| 资源 | 进度 / 周目 |
|:---:|:---:|
| ![资源](../screenshot/ace-combat-8-resources.png) | ![进度](../screenshot/ace-combat-8-progress.png) |

## 使用注意

1. 修改前**完全退出游戏**，并暂时**关闭 Steam 云同步**（云端可能覆写本地改档）。
2. 首次请用存档**副本**试验；保存前会自动备份（每文件最近 10 份）。
3. 伪二周目会保留机库与 MRP，把任务光标重置为 0，并打开通关后功能（涂装 / 徽章 / Aircraft Set 等）；DLC 机体进战役仍依赖 `CompletionCount ≥ 1`。
4. 请勿用于联机或传播已修改存档。

返回 [README](../../README.md)。
