# 影之刃零：删除 66 天 / NightmareRun 槽位

日期：2026-11-14  
模块 id：`phantom-blade-zero`  
状态：已实现（合成 fixture）  
关联：GitHub issue #3；Nexus mods/365（skyhighkorea）

## 背景

游戏内无法删除 66 天（NightmareRun）模式槽。这些槽与 Auto/Manual 同在单一 `PBZSaveGame.sav`（PBZS）容器目录中。整文件删除会毁掉普通存档。SaveSmith 已能编辑 `NightmareRunN` 内容，但不能从目录移除槽位。

## 目标

1. 从容器目录删除 `NightmareRun` / `NightmareRunN` 槽，保留 Auto/Manual 与其它无关槽。
2. 同步移除配对快照 `NightmareCycleStart[_*]` / `NightmareLineStart[_*]`。
3. 若 `__Advanced__.LastContinueSlot` 仍指向已删槽，改写为剩余 Manual（优先）或 Auto，避免「继续游戏」指向缺失槽。
4. UI 双语确认：说明保留 Auto/Manual、清理快照与继续指针、不可撤销（依赖宿主备份）；不承诺版本号或 ETA。

## 非目标

- 不解包游戏、不新增下载链、不引入真档到仓库。
- 不删除 Auto/Manual，不整文件 wipe。
- 不 bump 发布版本号（仅 CHANGELOG Unreleased，除非仓库另有硬性要求）。

## 决策

| 议题 | 决策 |
|------|------|
| 删除方式 | 过滤 `container.slots` 后走既有 `serializePbzsContainer` 重建目录/头/偏移（非 `serializeDirtySlots` 原地改 payload） |
| 槽名 | `/^NightmareRun\d*$/`（含无数字的 `NightmareRun`） |
| 快照配对 | 从待删 run JSON 收集 `NightmareLineageId` 及与已知后缀相同的字符串；删全部 run 时一并清孤儿快照；裸名 `NightmareCycleStart` / `NightmareLineStart` 随任一次删除清理 |
| 继续指针 | 仅当 `__Advanced__` 可解析且含 `LastContinueSlot` 时改写；优先最高编号 ManualSave，其次 AutoSave，再次剩余 NightmareRun；opaque Advanced 无法改写（文档标明） |
| 容器下限 | 删除后目录至少保留 1 槽，否则 `PBZ_INVALID_EDIT` |
| UI | 资源页；检测到 NightmareRun 槽时显示危险按钮 + ElMessageBox 确认 |
| 测试 | 仅合成 fixture；禁止提交真实用户存档 |

## 架构

- `model/nightmareRunSlots.ts`：名称判定、lineage 收集、继续指针回落
- `model/deleteNightmareRuns.ts`：过滤目录 + 更新 model/advanced + 重选槽
- `views/ResourcesTab.vue`：确认与调用
- 写盘仍经宿主 `writeAtomic` + 自动备份

## 验收

合成容器：删除 NightmareRun、保留 Auto/Manual、清快照、修 `LastContinueSlot`；`npm test` / `npm run typecheck` 通过。
