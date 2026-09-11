# 编辑器 markRaw / 表行反应性全面加固

日期：2026-09-11  
范围：C（Must + Should + Nice）  
状态：设计已口头确认 §1–§3，待实现

## 背景

存档状态经 `wrapState` → `markRaw` 后原地修改。Element Plus `el-input-number` 在父级不带着新 `model-value` 重渲时，会把显示拽回旧值。已用 `session.revision` + `savesmithRev` + `data-ss-rev` 堵住表单直绑路径，但 **el-table 行对象若仍是同一 markRaw 引用，单元格不刷新**——机体经验仍无法修改即此因。驾驶员页因 `map` 成新行对象而正常。

## 目标

1. 机体 / 星球等表内数字可稳定编辑（显示与脏标记同步）。
2. 堵住「未使用」机型写入与同类崩档路径。
3. 三游戏统一编辑契约，用测试锁住，避免再回归。
4. 适度加强 validate / 缺字段失败时机。

## 非目标

- 不改为深度 `reactive` 整棵存档树（成本与类实例兼容问题大）。
- 不重做 Formation 拖拽 UX。
- 不扩展泰拉瑞亚未暴露字段（染料等）。

## 铁律（编辑契约）

1. 凡进入 `el-table` / 列表的 controlled 数字控件，**行数据必须是 snapshot**：新对象 + 基本类型字段 + 稳定 `index`；禁止把 markRaw 实体直接当 `row`。
2. 读 markRaw 的 computed 必须 `void editor.rev`（或等价订阅）；列表返回新 identity（`map` / 新 Set / 新字段对象数组）。
3. `el-input-number` 只用 `@update:model-value`，不用 `@change`。
4. 每个游戏编辑 Tab 单根节点，并带 `:data-ss-rev="editor.rev"`；`el-dialog` 放在该根内。
5. 宿主继续：`mutate`/`runAction` 递增 `revision`，`EditorPage` provide `savesmithRev` 并传 `data-ss-rev`。

## 实现任务

### Must

| ID | 项 | 细节 |
|----|----|------|
| M1 | UnitsTab snapshot | `map((u,i)=>({ index, unitType, exp, characterId, custom, itemsCount }))`；`setUnitExp(row.index,v)`；删除 `indexOf` |
| M2 | PlanetsTab snapshot | 行含 `index` + 各 stats/max/faction；写回用 index |
| M3 | UnitsTab 禁未使用 | `groups` / 添加候选 `filter(!isUnusedEntry)` |
| M4 | FormationTab | 装备相关 computed 订 `void editor.rev`；删除 `invTick` |
| M5 | InventoryTab 单根 | dialog 移入根 `div`；保留内部 `data-ss-rev` |

### Should

| ID | 项 | 细节 |
|----|----|------|
| S1 | 契约文档 | `editorBindings.ts` 注释写明铁律 |
| S2 | Resources / Character / WB | 显式字段或 view computed 订 `editor.rev`（不靠隐式 getter） |
| S3 | 测试加固 | 见「测试」节 |
| S4 | Select | Planets faction 等改 `@update:model-value` |

### Nice

| ID | 项 | 细节 |
|----|----|------|
| N1 | CF validate | `unlockAll`/validate：`PlayerUnlockedUnitTypes` 不得含 `isUnusedEntry` 对应 id；保存前可自动剔除或报 issue |
| N2 | CF REQUIRED_KEYS | 扩到编辑页用到的字段（Credit/Prestige/Medals/Relationships/PlanetData/…），load 时失败而非切 Tab 抛 |
| N3 | WB validate | 若存在 `silver`，须为有限 number |
| N4 | TE stack | InputNumber `min` 与写入 clamp 一致（空槽 / 有物品） |

## 跨游戏核对

| 游戏 | 风险 | 动作 |
|------|------|------|
| 混沌兵团 | Units 表行（已证实）；Planets 表行；Formation invTick；可加未使用机体 | M1–M4, N1–N2 |
| Wanderburg | 资源已 fields snapshot，风险低 | S2, N3 |
| 泰拉瑞亚 | Inventory 双根；堆叠；Character 隐式 track | M5, S2, N4 |

## 测试

1. 源码契约：Units/Planets 含 snapshot/`row.index`；无表内 `indexOf` 改 exp；Formation 无 `invTick`；Inventory 单根；InputNumber 无 `@change=`。
2. 逻辑：mock 存档 `setUnitExp` 后，snapshot computed 的 `exp` 更新。
3. Chaos：添加候选不含「未使用」；validate/unlock 路径不含 unused id。
4. 全量 `vitest` + `typecheck`。

## 手测验收

- [ ] 混沌：资源、星球、**机体经验**、驾驶员、编队换装
- [ ] Wanderburg：银币
- [ ] 泰拉瑞亚：生命/魔力、堆叠、换物品
- [ ] 添加机体无「未使用」；全解锁进游戏不崩

## 风险

- 扩 `REQUIRED_KEYS` 可能让旧/精简测试夹具失败 → 同步更新 fixtures。
- validate 拒绝 unused 解锁：若用户档已含 unused id，保存时报 issue 或自动剔除（实现选 **保存时剔除并记 dirty**，避免卡死已污染档）。
