# 龙之剑：觉醒（DragonSword: Awakening）

[**中文**](dragon-sword.md) | [English](dragon-sword.en.md)

非官方存档修改说明。权利人：**HOUND13**（Steam AppID [4570720](https://store.steampowered.com/app/4570720/)）。与官方无关联。模块封面取自 Steam 商店头图，版权归 HOUND13。

> **仅限本地单机。** 不要在联机、讨伐/raid 或任何会校验服务端进度的模式下改档。改档前请完全退出游戏，并建议关闭 Steam Cloud，以免云存档把本地改动回滚。

## 存档位置

默认（Windows，Steam 常见安装）：

`%PROGRAMFILES(X86)%\Steam\steamapps\common\DragonSword  Awakening\DS\Saved\SaveGames`

其他盘的 Steam 库同理：`<library>\steamapps\common\DragonSword  Awakening\DS\Saved\SaveGames`。文件夹名里游戏标题中间有**两个空格**。

槽位形态：`<accountId>/<accountId>_SlotN.db`（SQLCipher v4 加密 SQLite）。不读写 `SPack_Slot*.sav`（UE 槽位摘要）与截图。

找不到目录时，在游戏库点「选择存档目录」，指向 `SaveGames`（其下是数字账号文件夹）。

## 格式说明

槽位编解码按公开格式说明独立实现（clean-room），**未移植**社区编辑器源码。格式参考：

[gfriloux/dragonsword-save-editor — docs/](https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs)

CID 名称来自本机 pak 导出的**派生 JSON**（见仓库 `scripts/README-dragon-sword-catalog.md`），不入库游戏原始 XML。目录暂缺时界面显示 `#CID`。

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 货币 | `tb_currency` 数量；可一键拉满 |
| 物品 | 堆叠物品数量；可按 CID 添加 |
| 料理 | 料理堆叠；配方 switch 解锁（可获得范围内） |
| 角色 | 等级、经验、突破 |
| 编队 | 三槽角色 CID（仅已有角色或空） |
| 装备 | 强化、经验、锁定；词条 CID 只读 |
| 解锁 | 已有角色、称号 bitmask、业力（不插入未购付费内容） |
| 外观 | 仅已拥有外观 / 载具 / 坐骑装备，不插入未购 CID |
| 世界 | 区域、段落、坐标 |

保存前自动备份（每文件最近 10 份），可在备份面板还原。保存时会拒绝负数/非有限金额与堆叠、非有限坐标、以及编队里不存在的角色 CID。

## 使用注意

1. 修改前**完全退出游戏**（进程名 `DSClient-Win64-Shipping.exe`；退出时可能覆写存档）。
2. 建议在 Steam 属性里**关闭云存档**，改完确认无误后再按需打开，避免云端旧档覆盖。
3. 仅供已购买正版的玩家在**本地、离线、单机**环境学习研究；禁止用于联机公平或传播已修改存档。
4. 首次请用存档**副本**试验。
5. 游戏更新若改加密或表结构，加载/写回可能失败，以当前版本发行说明为准。

返回 [README](../../README.md)。
