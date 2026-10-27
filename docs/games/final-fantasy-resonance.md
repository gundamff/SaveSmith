# 最终幻想：共鸣（FINAL FANTASY RESONANCE）

非官方存档修改支持。权利人：Square Enix；开发：LANCARSE。Steam AppID `3259780`。

## 存档位置

`%LOCALAPPDATA%\FFRS\Steam\<SteamID64>\`

| 文件 | 说明 |
|------|------|
| `GameSaveData0.sav` | 自动档 |
| `GameSaveDataN.sav` | 手动槽 N |
| `OptionSaveData.sav` / `EnhancedInputUserSettings.sav` | **不修改** |

格式：`SVHD` 头 + AES-256-ECB 体 + SHA-1；解密后为 UE5.5+ GVAS。

## 可编辑

- **记录**：Gil（`Player.currentMoney`）、时长/胜场只读展示
- **角色**：经验、HP、MP、武器/防具/幻象装备 ID
- **物品**：改数量；按 ID 新增（数量钳制 0–99）
- **幻象**：觉醒等级、同步点拉满
- **地图**：已知 / 已访问 / 已通关
- **图鉴**：`unitList` 击败数、Libra（`IsAnalyzed` + `analyzedElments`）
- **日志**：任务板交付数量、委托进度、斗技场通关次数；商店限购表只读；**主线 Progress 旗标只读**
- **神器**：仅当存档已有 `artifactList`（未获得神器前可能缺失）
- **快捷动作**：Gil 拉满、地图全知、全部 Libra、商店限购重置、重置已开宝箱

名称表：`catalog/names.json`（约 800+ 条英名；界面显示 `名称 (#id)`。中文暂与英文相同。可用 `scripts/ffr-derive-catalog.mts` 再生）。

## 注意

1. **先完全退出游戏**，建议暂时关闭 Steam 云同步。
2. 宿主会做备份；仍建议先复制存档目录。
3. 本工具与 Square Enix / LANCARSE 无关。
4. 格式说明曾参考社区开源工具 [ffr-save-editor](https://github.com/jesus-seijas-sp/ffr-save-editor)（MIT）的公开 README；实现为 Clean-room，未复制其源码。
5. `cover.jpg` 为占位图；正式发版可换商店头图并注明版权。
