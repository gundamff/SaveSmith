# 影之刃零：进度 Tab + BOSS 最佳用时

日期：2026-11-03  
模块 id：`phantom-blade-zero`  
状态：设计已确认（已实现（待提交/手测））  
前置设计：[2026-10-30-phantom-blade-zero-design.md](./2026-10-30-phantom-blade-zero-design.md)  
路径：标准通道 · savesmith-add-game + superpowers brainstorming  
续接会话：`377df758-9643-4ba7-8e11-dd446e0921bb`（本会话续做）

## 背景

在已有「资源 / 战绩」能力上，追加展示向字段编辑：

1. 游戏时间  
2. 战胜 BOSS 的最佳用时  
3. 周目计数  

对照档：小黑盒存档广场下载、文案称「二周目 + 多次死亡结局」的 `PBZSaveGame.sav`（本机 Steam 目录副本，**不入库**）。探路结论：

| 需求 | 字段 | 观察 |
|------|------|------|
| 游戏时间 | `PBZGameSystem.HasGameTime`、`CurrentCycleGameTime` | 真档中常相等；单位为秒 |
| BOSS 用时 | `BossRecord.*.Records.*.BestTimeMs` | 战绩投影已有 `bestTimeMs`，UI 未开放 |
| 周目 | `PBZGameSystem.CycleCount` | 对照档各槽多为 `0`；另有只读 `CycleRecords`（本期不改） |

原一期设计将「周目」列为非目标；本期以**白名单标量**有限放开，不伪造周目履历。

## 目标

1. 新建顶层 Tab **「进度」**：编辑周目计数与游戏时间。  
2. 在现有 **「战绩」** BOSS 表增加「最佳用时」列。  
3. 未知字段继续透传；写回路径不变（dirty 槽 zlib + AES-GCM）。  
4. 文档 / i18n / 手测说明与小黑盒 zlib 提示保持一致。

## 非目标

- 编辑或伪造 `CycleRecords`（Ending、Completion、周目 DiedTimes 等）  
- 编辑 `PendingSettlementEnding`、`EndingReturnSnapshotKey`、`bIsFinishGame`  
- 编辑 Nightmare* / 剧情 / 地图 / 任务  
- 为缺少 `BestTimeMs` 的 BOSS 行补写该键  
- 保证 `CycleCount` 与小黑盒文案「第 N 周目」在所有版本上语义完全一致（UI 旁注以游戏内为准）

## 决策摘要

| 议题 | 决策 |
|------|------|
| 实现路径 | 新建「进度」Tab；BOSS 用时留在战绩表 |
| 深度 | 白名单标量可写 |
| 游戏时间 UI | `时:分:秒` ↔ 总秒 |
| 游戏时间写回 | `HasGameTime` 与 `CurrentCycleGameTime` **写成同一秒数** |
| BOSS 用时 UI | 同为 `时:分:秒`；写回 `seconds * 1000`（亚秒丢弃） |
| 周目 UI | 「第 X 周目」= `max(CycleCount, CycleRecords 条数) + 1`；写回只改 `CycleCount = X - 1`，且 `X ≥ 履历条数 + 1` |
| `CycleCount` 范围 | `0..99`（UI 下限由履历抬高，上限第 100 周目） |
| 游戏时间秒范围 | `0..3599999`（约 `999:59:59`） |
| `CycleRecords` | 最多只读旁注条数，不编辑 |

## 架构

### 模块边界

| 路径 | 职责 |
|------|------|
| `model/progress.ts`（新） | 投影 / 写入 `PBZGameSystem` 周目与游戏时间；时长换算；校验收集 |
| `model/bossRecords.ts`（扩） | 新增 `setBossBestTimeMs`；校验 `BestTimeMs` |
| `model/saveModel.ts`（扩） | 导出 progress API；`validate` 汇总 progress / boss 用时 issue |
| `views/ProgressTab.vue`（新） | 槽位选择、周目、游戏时间、只读旁注 |
| `views/RecordsTab.vue`（扩） | BOSS 表「最佳用时」列 |
| `views/index.ts` | 注册 `progress` Tab（顺序：资源 → 战绩 → 进度） |
| `host/i18n/zh.ts` + `en.ts` | Tab 与表单项文案 |
| `docs/games/phantom-blade-zero.md` + `.en.md` | 可编辑范围更新 |
| `docs/HANDTEST.md` | 进度 / 用时手测节 |
| `CHANGELOG.md` + `.en.md` | 记一笔 |

模块仍不访问 `fs`、不直接 `invoke` Tauri。

### 数据流

```text
parse → 内部槽 document
  → ProgressTab: projectProgress(slot) / setCycleCount / setGameTimeSeconds
  → RecordsTab: projectBossRecords + setBossBestTimeMs
markDirty → serialize(dirty slots) → 宿主原子写
```

### 进度投影（概念）

```ts
interface ProgressView {
  cycleCount: number            // 原始 CycleCount；非法则为 NaN
  cycleDisplay: number          // cycleCount + 1（仅当 cycleCount 合法）
  gameTimeSeconds: number       // 编辑用：优先 CurrentCycleGameTime，否则 HasGameTime
  hasGameTime: number | null
  currentCycleGameTime: number | null
  timesMismatch: boolean        // 两者皆有且不等
  cycleRecordCount: number      // Object.keys(CycleRecords||{}).length，只读
  editable: boolean             // 存在可用的 PBZGameSystem 且关键字段可解释
}
```

`setGameTimeSeconds(model, slot, seconds)`：校验通过后同时写入 `HasGameTime` 与 `CurrentCycleGameTime`。  
`setCycleCountFromDisplay(model, slot, displayWeek)`：`CycleCount = displayWeek - 1`。

### BOSS 用时

- 已有行且存在合法 `BestTimeMs` 才可编辑。  
- UI 秒 = `Math.round(BestTimeMs / 1000)` 填表；写回 `BestTimeMs = seconds * 1000`。  
- 不改 `KillCount` / `AttemptCount` / 通关态。

## 校验与错误

| 条件 | 行为 |
|------|------|
| `CycleCount` 越界或非安全整数 | `PBZ_INVALID_CYCLE_COUNT`，拒写 |
| 存在的 `HasGameTime` / `CurrentCycleGameTime` 越界 | `PBZ_INVALID_GAME_TIME`，拒写 |
| 两者皆有但不等 | **不阻断**打开；保存时双写统一 |
| 任一时间字段缺失或越界 | 进度**时间**控件禁用（不新建缺失键）；周目仍可按 `CycleCount` 是否合法单独决定；不因此整档失败 |
| 无 `PBZGameSystem` | 进度 Tab 空态；不抛整档失败 |
| 存在的 `BestTimeMs` 非法 | `PBZ_INVALID_BOSS_BEST_TIME` |
| 行无 `BestTimeMs` | 显示「—」，不新增键 |

## 测试与验收

1. 单测：时长 ↔ 秒；周目 UI ↔ `CycleCount`；双字段同写；`setBossBestTimeMs` 毫秒对齐。  
2. 单测：越界拒写；缺 `PBZGameSystem` / 缺 `BestTimeMs` 不崩。  
3. `PBZ_SAVE` 门控只读回归：至少一槽可读出游戏时间 / `CycleCount` / 若干 `BestTimeMs`。  
4. 手测：改游戏时间与周目显示 → 进游戏看摘要；改一 BOSS 用时；zlib 查看器仍按「进游戏再存一次」处理。

## 风险

| 风险 | 缓解 |
|------|------|
| `CycleCount` 与玩家理解的「二周目」不完全对齐 | 旁注「以游戏内为准」；不伪造 `CycleRecords` |
| 亚秒 `BestTimeMs` 被抹平 | 文档写明秒级精度 |
| 只改标量后第三方查看器仍失败 | 保留既有 zlib / Oodle 说明 |

## 修订原设计非目标

原 [2026-10-30 设计](./2026-10-30-phantom-blade-zero-design.md)「非目标」中的「编辑……周目……」对本期修订为：

- **仍禁止**：伪造周目履历、结局结算、噩梦线、剧情地图任务。  
- **本期允许**：白名单标量 `CycleCount`、`HasGameTime`、`CurrentCycleGameTime`、已有 `BestTimeMs`。
