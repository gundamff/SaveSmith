# 影之刃零：BOSS 战绩难度改挂

日期：2026-11-09  
模块 id：`phantom-blade-zero`  
状态：设计已确认（待写计划 / 实现）  
前置：[2026-11-03-phantom-blade-zero-progress-design.md](./2026-11-03-phantom-blade-zero-progress-design.md)、[2026-10-30-phantom-blade-zero-re-playbook.md](./2026-10-30-phantom-blade-zero-re-playbook.md)  
路径：标准通道 · brainstorming → 本文 → writing-plans → TDD 实现

## 背景

战绩页已支持身陨、按难度分行的被击杀次数与最快用时。难度本身是 `BossRecord.<bossId>.Records` 的**字典键**（真档常见 `0_2` / `0_3`），界面目前只读。用户需要把**已有**击杀/战绩从难度 X 改挂到难度 Y，不伪造未打过的通关。

## 目标

1. 战绩表「难度」列改为下拉，选项来自解包当前游戏得到的**完整合法键白名单**。  
2. 改挂 = 整份 `Records` entry 从旧键移到新键；不改 entry 内部字段。  
3. 目标键已存在则拒绝；非法键拒绝。  
4. 所有写失败以**当前语言**友好文案展示（`translateError`），禁止把裸 `PBZ_INVALID_EDIT` 甩给玩家。  
5. 文档 / i18n / HANDTEST / CHANGELOG 同步。

## 非目标

- 伪造从未遭遇的 BOSS，或从未打过的难度通关行  
- 合并或覆盖已有目标键  
- 改 `KillCount` / 通关态 / `CycleRecords`  
- 运行时读本机游戏安装目录建白名单  

## 决策摘要

| 议题 | 决策 |
|------|------|
| 场景 | 仅改挂已有记录（A） |
| 目标键冲突 | 拒绝，不合并、不覆盖 |
| 键来源 | 解包当前 Steam build → 仓内静态 catalog |
| UI | 战绩表难度列内联下拉 |
| 错误 | 专用错误码 + zh/en；UI 只显示译文 |
| 校验保存 | 未知难度键的已有行不因「不在 catalog」拦保存（透传）；白名单只在写路径强制 |

## 存档字段

```text
BossRecord.<bossId>.Records.<difficultyKey> → {
  AttemptCount, KillCount?, BestTimeMs?, …未知键透传
}
```

改挂操作：`Records[to] = Records[from]; delete Records[from]`。

## Catalog

新建（名称实现时可微调）`catalog/bossDifficulties.json` + 查询模块：

| 字段 | 含义 |
|------|------|
| `key` | 存档键 |
| `zh` / `en` | UI 显示名 |
| `order`（可选） | 下拉排序 |

`catalog/SOURCE.md`（或同文件段落）记录：Steam build、导出表/枚举路径、生成命令。导表流程遵循 RE playbook（CUE4Parse / FModel）；**产物入库，工具与临时解包不入库**。

## 架构

| 路径 | 职责 |
|------|------|
| `catalog/bossDifficulties.json` + TS 查询 | 白名单、显示名、排序 |
| `model/bossRecords.ts` | `setBossDifficultyKey`；投影可附带显示名或由 UI 查表 |
| `model/saveModel.ts` | 导出 API |
| `views/RecordsTab.vue` | 难度列下拉；失败友好提示；短风险警示 |
| `host/i18n/zh.ts` + `en.ts` | 列/警示 + **每个**新错误码的完整句 |
| `docs/games/phantom-blade-zero.md` + `.en.md`、HANDTEST、CHANGELOG | 范围与手测 |
| 测试 | 挪键成功、冲突、非法键、i18n 译文存在 |

模块仍不访问 `fs`、不直接 `invoke` Tauri。

### API

```ts
setBossDifficultyKey(
  model,
  slotName,
  bossId,
  fromKey,
  toKey,
): void
```

1. 可编辑槽；`fromKey === toKey` → no-op  
2. `toKey` ∉ catalog → 专用错误（友好文案含难度展示名或 key）  
3. 无 `fromKey` 条目 → 专用错误  
4. 已存在 `toKey` → 专用错误（含 BOSS 与两难度）  
5. 整对象搬迁；`slot.dirty = true`  
6. 不修改 entry 内字段  

错误码须**细分**（实现时定名），例如：

- 非法/非白名单目标难度  
- 源记录不存在  
- 目标难度已有记录  

禁止对上述可预期失败复用无参/含糊的 `PBZ_INVALID_EDIT` 作为唯一用户可见结果。`translateError` 在 zh/en 均须有对应 `error.*` 模板；单测覆盖「每个新 code 能译出非 code 本身的句子」。

### UI

- 难度列：`el-select`（或现有组件风格），选项 = catalog 全量（`order`）。  
- 变更 → `setBossDifficultyKey` → `markDirty`；catch 后 `translateError` 提示。  
- 战绩页短警示：改难度可能影响游戏内/小黑盒展示，务必备份。

### 数据流

```text
parse → projectBossRecords
  → 用户改下拉
  → setBossDifficultyKey（白名单 + 冲突检查）
  → slot.dirty → 既有 serialize（Oodle stored + GCM）
```

## 风险与诚实边界

- 白名单依赖当前 build 导表；游戏更新后可能要重导。  
- 只改 JSON 键，不保证成就/图鉴旁路一致。  
- 漏登 i18n 会退回裸 code → 用测试锁死。

## 验收

1. Fixture：合法改挂后旧键消失、新键对象全等、dirty。  
2. 冲突 / 非法键抛专用错误；中英 `translateError` 可读且不含「只显示 code」。  
3. 未改难度的保存与未知键行的次数/用时编辑仍可用。  
4. 真档手测：改一条已有战绩难度 → 游戏可载入且挂在新难度（HANDTEST）。

## 开放实现细节（计划阶段钉死，不阻设计）

- 导表具体资产路径与键编码含义（如 `0_2` 各段）在解包时写入 SOURCE，并映射 zh/en 正式难度名。  
- 错误码最终字符串与 args 顺序在 plan/TDD 时定稿。
