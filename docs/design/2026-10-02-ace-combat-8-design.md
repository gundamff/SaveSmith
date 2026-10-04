# ACE COMBAT 8 存档模块设计

日期：2026-10-02  
范围：Campaign.sav 轻量 GVAS 补丁（MRP + 伪二周目）  
状态：已实现首版

## 背景

- 存档：`%LOCALAPPDATA%\BANDAI NAMCO Entertainment\ACE COMBAT 8\Saved\SaveGames\Campaign.sav`
- 格式：UE5 GVAS（`/Script/Live.LiveCampaignSaveGame`）
- 一周目限制：战役涂装/徽章/Aircraft Set、DLC 机体进战役需通关一次

`FeatureFlagMask` 各位对应 exe 中 `ELiveFeature` 枚举（bit1=AceDifficulty … bit13=DataViewer）。通关差值主要为 AircraftSet/Skin/Emblem/SpWeapon2ndSlot/Weathering（`0x634`）。「开启通关权限」应 OR 完整通关掩码 `0x3EFC`（含 AircraftTree），并同步 `UnlockedHangarSituationIDs`（1–31）与合并通关档 `UnlockedAircraftTreeNodeIDs`；仅改旗标不够。

## 目标

1. 编辑 CurrentMRP / TotalMRP
2. 开启通关权限（FeatureFlag + CompletionCount + Free Mission 列表）
3. 伪二周目：在通关权限基础上把任务光标重置为 0，保留机库/MRP

## 非目标

- 不改 Online / Replay / System.sav
- 不做机体树可视化编辑
- 不保证联机安全

## 实现

`src/games/ace-combat-8/`：定点查找 GVAS 标量与 `ArrayProperty<IntProperty>`，未知字节透传；扩写 Free Mission 数组后重新定位偏移。

## 封条（Checksum）

`Checksum`（外层 `UInt32Property`）= **CRC32（PackedData 嵌套字节，种子 `0x41916EBD`）**：

- 输入：`PackedData` 的 Byte 数组载荷（不含 count 头）
- 算法：标准 CRC-32／ISO-HDLC 多项式 `0xEDB88320`，初值 `~0x41916EBD`，终值再 `^ 0xFFFFFFFF`
- 任何改动（含仅改 MRP）后必须重算写回，否则游戏报「存档已损坏」
- 扩写 PackedData 内数组时，同步更新外层 `PackedData` 的 `dataSize` / `count`
