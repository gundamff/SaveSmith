# 混沌兵团：收编灭亡势力驾驶员

日期：2026-09-23  
范围：`chaos-front` 驾驶员页「添加」——仅已灭亡势力的领袖/间谍/指挥官  
状态：设计已确认，待写实现计划  
相关：机体 `addUnit` 交互对称；崩溃约束来自同场双同 ID 驾驶员

## 背景

存档酱已支持混沌兵团机体随意追加（`UnitsTab` + `SaveData.addUnit`），驾驶员页目前只能改经验。玩家希望能像机体一样追加驾驶员。

游戏侧硬约束：若某一驾驶员 ID 同时出现在己方与敌方（或其他势力仍上场），同场战斗可能崩溃。因此：

- **其他势力驾驶员**：仅当该势力已灭亡（`FactionData.isActive === false`）才可添加。
- **任务解锁驾驶员**：明确不支持（不进可选池、不做旁路）。

解包依据（`resources.assets` TextAsset）：`CharacterData`、`FactionData`、`MssionData.GetCharacter`、`CollectionMemberData`；运行时存档以 `PlayerCharacters` / `PlayerCharacterEXPs` / `FactionData` 为准。静态表不足以枚举全部「势力绑定」角色，可选池必须从**当前存档**的灭亡势力字段推导。

## 目标

1. 在驾驶员页提供「添加」对话框（选人 + 等级 1–10，默认满级）。
2. 写入 `PlayerCharacters` + `PlayerCharacterEXPs`，并同步从灭亡势力的 `leader` / `spyMaster` / `commanders` 中移除该 ID。
3. UI 常驻说明：灭亡前置、会从势力名单移除、不支持任务解锁。
4. 单元测试覆盖闸门与写入副作用。

## 非目标

- 任务解锁驾驶员（`MssionData.GetCharacter` / `CollectionMemberData` 中 `Mission ≠ 0`）。
- 现役势力（`isActive === true`）挖角。
- 删除驾驶员、编队页招人入口。
- 扩展 `game-data.json` 的角色→势力静态全表（YAGNI；池子存档驱动）。
- 二次确认弹窗（说明文案已足够）。

## 方案选型

| 方案 | 结论 |
|------|------|
| 1. 驾驶员页对话框（对齐机体） | **采用** |
| 2. 星球/势力页「收编」 | 否：与机体流不对称 |
| 3. 全角色目录 + 灰显 | 否：误放风险高，已否「尽量全角色」 |

## 数据与闸门

### 写入

- `PlayerCharacters.push(characterId)`
- `PlayerCharacterEXPs.push(exp)`，`exp` 由等级 1..10 经现有 `characterExpForLevel`（或等价）换算；默认等级 10 → `CHARACTER_MAX_EXP`
- 遍历全部 `FactionData`：若 `leader` / `spyMaster` / `commanders[]` 含该 ID，则清除（标量置 `0`，数组过滤）

### 可选池 `listRecruitablePilots(gd)`

对每个 `isActive === false` 的势力，收集 `leader`、`spyMaster`、`commanders` 中 `id > 0` 的项，过滤后去重：

| 条件 | 处理 |
|------|------|
| 已在 `PlayerCharacters` | 排除 |
| `characterById` 缺失或名称「未使用」 | 排除 |
| 同 ID 出现在多个灭亡势力字段 | 列表去重；写入时所有命中字段都清 |

每项携带：`characterId`、`factionId`、来源势力显示名、`role`（`leader` | `spyMaster` | `commander`）。

### 不变式

- 不向 `PlayerCharacters` 写入重复 ID
- 不添加仍挂在任一 `isActive === true` 势力上的 ID
- `addPilot` 在写入前重算闸门（防 UI 绕过）

### API（`saveModel`）

- `listRecruitablePilots(gd): RecruitablePilot[]`
- `addPilot(gd, characterId, level): void`

| `ModuleError` code | 何时 |
|--------------------|------|
| `PILOT_NOT_RECRUITABLE` | 不在可选池 |
| `PILOT_ALREADY_OWNED` | 已在玩家名单 |
| `PILOT_LEVEL` | 等级不在 1..10 |

## UI 与文案（`PilotsTab`）

- 工具栏：「全部 Lv10」旁 **添加** → 对话框
- 对话框顶部常驻说明（中英 `i18n`）：
  - 仅已灭亡势力的指挥官/领袖/间谍头目
  - 添加后会从该势力名单移除，避免同场双人崩溃
  - 不支持任务解锁驾驶员
- 人选下拉：`{姓名}（{势力名} · {角色}）`，可筛选
- 等级：1–10，默认 10
- 空池：下拉禁用 +「当前没有已灭亡势力的可收编驾驶员」
- 成功 Toast：`已添加 {姓名}（已从「{势力名}」移除）`

## 测试

`tests/chaos-front`（vitest）：

1. 灭亡势力指挥官 → 进入 `PlayerCharacters`，原势力字段已清
2. 现役势力同 ID → `PILOT_NOT_RECRUITABLE`
3. 已拥有 → `PILOT_ALREADY_OWNED`
4. `listRecruitablePilots`：空池 / 去重 / 排除已拥有
5. 等级 → 经验换算（含满级）

真档进游戏手测可选，不阻塞合并。

## 文档

实现后更新 `docs/games/chaos-front.md`（及 `.en.md`）驾驶员能力说明一行。

## 实现触及文件（预估）

- `src/games/chaos-front/model/saveModel.ts` — API
- `src/games/chaos-front/views/PilotsTab.vue` — UI
- `src/games/chaos-front/i18n.ts` — 文案与错误码
- `tests/chaos-front/*.spec.ts` — 用例
- `docs/games/chaos-front.md` / `.en.md` — 用户说明

## 成功标准

- 仅灭亡势力指挥官可添加；任务人与现役势力人不可添加
- 添加后玩家名单有人、原势力字段无该 ID
- 文案足以说明前置条件与副作用
- 相关 vitest 全绿
