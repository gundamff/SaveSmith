# Belmont's Curse 背包编辑 + 中英名称表设计

日期：2026-10-26  
模块：`belmonts-curse`  
状态：已设计（待实现计划）  
前置：[2026-10-19-belmonts-curse-design.md](./2026-10-19-belmonts-curse-design.md)（一期标量；二期映射双写仍延期）

## 决策记录

| 议题 | 选择 |
|------|------|
| 背包深度 | 允许增删 `itemsInInventory`（去重）；**不**双写 `worldSaves` |
| 装备 | 可改武器/法术/皮肤/护符；装备 ID 须已在背包（护符可 `""`） |
| 名称表 | 先打通 Addressables（UnityPy）抽全 `en` + `zh-cn`，再开编辑 UI |
| 架构 | UnityPy 抽表 → `items.json` → `featureFlags.addItem` 门闩 → InventoryTab 可写 |

## 背景

- 一期 InventoryTab 只读；`catalog/items.json` 为空（脚本未解码 bundle）。
- 探路：Addressables `*.bundle` 内含 Unity Localization `StringTable` / `SharedTableData`；可用本机 **UnityPy** 读取 `m_TableData`（`m_Id` + `m_Localized`）与 Shared key。
- 生命之镜读档会回满 HP/MP；与本迭代无关。本迭代风险是**背包与世界拾取状态不同步**。

## 目标

1. 开发机脚本从本机安装抽出 `Items_*` 中英名称 → `catalog/items.json`（无图标）。
2. 名称表就绪后门闩打开：背包增删（去重）+ 装备编辑（约束见下）。
3. UI / 错误码 / 用户文档 **中英**完整；明确「不双写世界，可能再次捡到」。

## 非目标

- `worldSaves.savableEntityStates` 双写 / 二次解锁手测门闩（仍属原二期 mapping）。
- 能力 / Arcana / `vaniaMoves` 新增。
- `PLAYERPREFS` / DLC 强开。
- 把 UnityPy 打进便携运行时。
- 一次挂载全量 `el-option`（必须搜索/截断）。

## 架构

### 抽表（开发机）

- 入口：扩展 `scripts/bc-extract-names`（TS 调 Python，或纯 `scripts/bc-extract-names.py` + README 说明）；依赖 **UnityPy（本机 pip）**。
- 输入：`--game` 指向安装根或 `*_Data`。
- 扫描：`StreamingAssets/aa/StandaloneWindows64/*.bundle`。
- 读取：
  - SharedTableData（Items 相关）：条目 **key**（期望对齐存档 ID）。
  - `Items_*_en` / `Items_*_zh-cn` StringTable：`m_Id` → 显示名。
- 优先表族：Weapons、Charms、Spells、Skins、Clues及 catalog 中其它 `Items_*` 带 `_en`/`_zh-cn` 者。
- 合并：Shared key × locale 按 `m_Id` 对齐 → `id → { en, zh }`；缺 zh 则 `zh=""`（运行时回退 en→id）或 `zh=en`。
- 输出：`src/games/belmonts-curse/catalog/items.json`；更新 `SOURCE.md`（`app.info` + `m_BuildResultHash`）。
- 失败：写出 `{}`、非零退出；不假绿。

### 门闩

```text
MIN_ENTRIES = 50
catalogReady =
  keys(items).length >= MIN_ENTRIES
  && 存在前缀 Weapon* / Charm_* / Skin_* 各至少 1 条

featureFlags.addItem = catalogReady
featureFlags.addAbility = false   // 不变
```

未就绪：Inventory **只读** + 提示运行抽表脚本。

### 运行时模块

| 文件 | 职责 |
|------|------|
| `catalog/names.ts` | `lookupItemName(id, locale)`；zh→en→id |
| `model/inventory.ts` | add/remove/equip 变更 `raw.playerSave` + 投影 |
| `model/featureFlags.ts` | `addItem` 跟 catalogReady |
| `views/InventoryTab.vue` | 可写 UI；搜索下拉 |
| `parse.ts` / `validate` | 透传；校验重复与孤儿装备 |
| `src/host/i18n/zh.ts` + `en.ts` | `bc.inventory.*`、`error.BC_INV_*` |

## 编辑语义

### 背包

- `addItem(id)`：已存在 → no-op；否则 append。
- `removeItem(id)`：移除；若装备占用该 ID → 武器/法术改背包内其它或 `""`；皮肤尽量保留 `Skin_MC_Base` 若仍在包中否则 `""`；护符槽清空匹配项。

### 装备

- `equippedWeaponItem` / `equippedSpellItem` / `equippedSkin`：必须非空且 `∈ itemsInInventory`；UI 禁止选空；若删除导致无处可挂，删除流程先改挂背包内其它合法 ID，否则 validate 失败阻止保存。
- `equippedCharmItems[i]`：`""` 或 `∈ itemsInInventory`。

### validate

| 码 | 条件 |
|----|------|
| `BC_INV_DUP` | 背包有重复 ID |
| `BC_EQUIP_ORPHAN` | 非空装备 ID 不在背包 |

## UI

- 语言：`locale` 切换时名称列走 `lookupItemName`。
- 添加：过滤输入 + 最多展示约 80 条 options（防 OOM）。
- 提示键：`bc.inventory.needCatalog`、`bc.inventory.noWorldSync`、更新原 `readonlyHint`。

## 测试与验收

- 单元：inventory 去重/装备约束/validate；names 回退。
- 抽表：有 `BC_GAME` 或默认本机路径时条目 ≥ MIN；无安装则 skip。
- HANDTEST：副本添加 → 游戏可见可装备；原获取点再触发（记录是否重复）；中英切换名称。
- `npm test` + `npm run typecheck`。

## 风险

| 风险 | 缓解 |
|------|------|
| 世界不同步 / 再捡到 | UI+文档；双写另立项 |
| Shared key ≠ 存档 ID | 门闩+手测；必要时后续 `idAliases` |
| Catalog 过大拖垮下拉 | 搜索截断 |
| 许可 / 包体 | 只派生 JSON；UnityPy 不进发行包 |

## 实现顺序（摘要）

1. 抽表脚本打通并生成本机 `items.json`
2. featureFlags + inventory model + validate + 测试
3. InventoryTab 可写 UI + i18n
4. 文档 / HANDTEST / CHANGELOG
5. 全量验证

## 参考

- 探路：UnityPy 可读 `Items_Weapons_zh-tw` 等 StringTable 的 `m_TableData`
- 存档字段：`playerSave.itemsInInventory`、`equippedWeaponItem`、`equippedSpellItem`、`equippedSkin`、`equippedCharmItems`
