# 影之刃零：可编辑槽加入 NightmareRun

日期：2026-11-06  
模块 id：`phantom-blade-zero`  
状态：已实现（合成 fixture 已绿；Nightmare 真档对拍仍缺）  
前置：[2026-10-30-phantom-blade-zero-design.md](./2026-10-30-phantom-blade-zero-design.md)  
触发：Nexus mods/365 反馈——二周目/高难存档内部名为 `NightmareRun0`，界面仅有 AutoSave / ManualSave

## 背景

物理主档仍是单一 `PBZSaveGame.sav`。可编辑内部槽名白名单目前为：

```text
^(?:AutoSave|ManualSave)\d+$
```

玩家反馈二周目（及类似难度）槽为 `NightmareRun0`。此前对照档多来自小黑盒存档广场；若广场档也落在 `NightmareRun*`，探路时只盯 Auto/Manual 会漏掉真实周目槽，表现为「只能改 Auto/Manual」。

设计文档里「不编辑 Nightmare*」指的是 **周目/结局等字段**（如 nightmare cycles），**不是**容器目录里的 `NightmareRunN` 槽名。

本机暂无带 `NightmareRun*` 的真档可对拍；按与 `AutoSave` **同构 JSON** 假设推进，并在用户文档标明未对拍与备份要求。

## 目标

1. 将 `NightmareRunN`（`N` 为十进制数字）纳入可编辑内部槽，资源 / 战绩 / 进度 / 装备等现有 Tab 与 Auto/Manual **同权**。
2. 解析、校验、脏槽写回路径与 Auto/Manual 共用，不另开 UI。
3. 文档与错误文案写明：含 NightmareRun；**未用 Nightmare 真档对拍**；改前务必备份。

## 非目标

- 仍不编辑 `CycleRecords`、结局字段、剧情/地图/任务，以及文档已列的 nightmare **字段**（与槽名无关）。
- 不把 `NightmareRun` 拆成独立物理文件或独立宿主槽。
- 本期不主动探测/改名其它未报告的槽名模式。
- 不保证小黑盒广场档一定等于玩家二周目结构（仅作历史对照说明）。

## 决策摘要

| 议题 | 决策 |
|------|------|
| 槽名模式 | `NightmareRun` + 一位及以上数字，与 Auto/Manual 并列：`/^(?:AutoSave\|ManualSave\|NightmareRun)\d+$/` |
| 大小写 | 按反馈字面 `NightmareRun`（Pascal 拼接）；不做大小写折叠 |
| 深度 | 与 Auto/Manual 同权（同构假设） |
| 真档对拍 | **无**；文档 + CHANGELOG + HANDTEST 标明风险 |
| 正则落地 | **单一实现** `model/editableSlotName.ts` 的 `isEditableSlotName`；`saveModel` 再导出；`equipment` / `bossRecords` / `progress` 一律 import（避免与 equipment 循环依赖） |
| `__Advanced__` 等 | 仍只读透传 |
| 背包 Max 问题 | 不在本变更范围（0.17.7 已修）；Nexus 另回帖 |

## 架构与改动面

| 路径 | 改动 |
|------|------|
| `model/saveModel.ts` | 扩展 `EDITABLE_SLOT_NAME`；保持导出 `isEditableSlotName` |
| `model/equipment.ts`、`bossRecords.ts`、`progress.ts` | 去掉本地正则，改用 `isEditableSlotName` |
| `parse.ts`、各 Tab、`slotSelection.ts` | 已走 `isEditableSlotName`，行为随正则自动扩展 |
| `host/i18n` | `PBZ_NO_EDITABLE_SLOTS` 文案加入 NightmareRun |
| `docs/games/phantom-blade-zero.md` + `.en.md` | 可编辑槽列表 + **未对拍 / 备份** 说明 |
| `docs/HANDTEST.md` | 增加 NightmareRun 手测节（有档则测；无档则跳过并记） |
| `CHANGELOG.md` + `.en.md` | Unreleased / 下一版本记一笔 |
| 测试 | `isEditableSlotName('NightmareRun0')`；fixture 含 NightmareRun 的 parse/select/serialize；e2e 断言同步放宽 |

模块仍不碰 `fs` / 不直接 `invoke` Tauri。

## 风险

| 风险 | 缓解 |
|------|------|
| Nightmare JSON 与 AutoSave 不同构 | 文档标明未对拍；校验失败拒绝写盘；手测嘱备份 |
| 误匹配其它名字 | 锚点全名 + `\d+`；不匹配无数字后缀 |
| 重复正则漂移 | 本变更强制单一 `isEditableSlotName` |

## 验收

1. 单元：`NightmareRun0` / `NightmareRun12` 可编辑；`NightmareRun`、`nightmarerun0`、`AutoSave` 不可。
2. 合成容器含 `NightmareRun0` 时 parse 进 model，可改 Dust 并 serialize 只脏写该槽。
3. `npm test`（至少 phantom-blade-zero 相关）与 `npm run typecheck` 通过。
4. 文档明确：未对拍 Nightmare 真档；退出游戏、副本备份。

## 实现顺序（确认后）

1. 扩展正则 + 去重 import + 单测  
2. i18n / 游戏文档 / HANDTEST / CHANGELOG  
3. 跑验证并贴输出  
4. （可选）用户提供 Nightmare 真档后再补 e2e 对拍  

确认本设计后进入实现；确认前不改业务代码。
