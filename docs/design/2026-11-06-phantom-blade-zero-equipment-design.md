# 影之刃零：主武器 / 影武 / 饰品编辑

日期：2026-11-06  
模块 id：`phantom-blade-zero`  
状态：已实现并手测通过（0.17.8）  
前置设计：[2026-10-30-phantom-blade-zero-design.md](./2026-10-30-phantom-blade-zero-design.md)  
字段对照：PBZ-Editor（MIT，`qry6868/PBZ-Editor`）公开布局；**不复制**其源码 / UI / 读包图标  
路径：标准通道 · brainstorming → 本文 → writing-plans → TDD 实现

## 背景

SaveSmith 现已支持 Dust、武器强化材料、养成堆叠、战绩与进度时间；背包唯一件（主武器 / 影之武装 / 饰品）仍为非目标。对标修改器以这三类为高频需求（补漏装、调强化）。用户确认本期做 **B：主武器 + 影武 + 饰品**，并要求 UI **醒目标注可能坏档、务必备份**。

## 目标

1. 「资源」页新增三个 Tab：**主武器**、**影之武装**、**饰品**。  
2. 支持：搜索添加、改强化等级、删除（带装备态防护）。  
3. 静态 catalog 收录经筛选的可编辑条目（id / 中文名 / `maxLevel`）；不读本机游戏安装目录。  
4. 脏槽写回路径不变（Oodle stored `compression=2` + AES-GCM）。  
5. 文档 / i18n / `docs/todo.md` / CHANGELOG 同步。

## 非目标

- 药品、普通 `goods` 全量扩面、外观 / `__Advanced__` 衣柜  
- 炼魂（`AlreadySnapSoul`）等高级字段的独立 UI（新建时仅 `setdefault` 默认）  
- 地图筛选、物品图标、运行时从 `.pak` 建目录  
- 保证每一件装备的游戏内效果 / 剧情 / 成就均已验证  
- 编辑当前配装列表本身（除删除饰品时清 `AccessoryIDs` 槽位）

## 决策摘要

| 议题 | 决策 |
|------|------|
| 范围 | 主武器 + 影武 + 饰品 |
| Catalog | 新建仓内静态 `catalog/equipment.json`（与堆叠 `items.json` 分离）；构建脚本从 build `26266538` 导出表抽取 |
| 过滤 | 排除明显测试 / 占位 / 序章废弃行（名称或 id 启发式，对齐对标 `experimental` 思路） |
| 件数 | 唯一记录，数量恒为 1；UI 只编**强化等级** |
| 主武等级 | UI `L` ↔ 存档 `WeaponLevel = L + 1` |
| 影武等级 | UI `L` ↔ 存档 `ShaChiWeaponLevel = L + 1` |
| 饰品等级 | UI `L` ↔ 存档 `CurrentLevel = L`（同值） |
| 等级上限 | 有 catalog `maxLevel` 则钳制 `0..maxLevel`；无表上限的主武/影武用文档化默认上限（实现时取保守常数，真档已超上限允许下调不可再上调） |
| 删除主武 | 若 id ∈ `MainWeapons` 或 `== CurrentMainWeaponID` → 拒绝，提示先游戏内卸下 |
| 删除影武 | 若 id ∈ `ShaqiWeapons` → 拒绝 |
| 删除饰品 | 若 id ∈ `AccessoryIDs` → 对应下标改为 `"None"` 再删 `AccessoryInfos` 记录 |
| 风险文案 | 三类 Tab（及/或资源页）独立 **error/warning** 警示：可能坏档、未逐件验证、**务必先备份** |
| 对标代码 | 只参考字段语义；实现用本仓 TS 风格重写 |

## 存档字段

均在可编辑槽 `document.Inventory` 下：

| 类别 | 字典字段 | 等级字段 | 新建默认（缺失时） |
|------|----------|----------|-------------------|
| 主武器 | `MainWeaponInfos` | `WeaponLevel` | `DateTime`、`AlreadySnapSoul=0`、`AcquiredCycle`、`FirstAcquiredCycle`；写等级时 `HasUIRedPoint=true` |
| 影武 | `ShaChiWeaponInfo` | `ShaChiWeaponLevel` | `DirtyTime`、`AlreadySnapSoul=false`、`AcquiredCycle`、`FirstAcquiredCycle`；`HasUIRedPoint=true` |
| 饰品 | `AccessoryInfos` | `CurrentLevel` | `DirtyTime`、`AcquiredCycle`；`HasUIRedPoint=true` |

时间戳格式复用现有 `formatPbzTime`；周目取槽内已有投影（与材料 `AcquiredCycle` 同源）。

未知键继续对象语义透传：改等级只碰白名单键；删除整键；添加只写上表默认 + 等级。

## 架构

| 路径 | 职责 |
|------|------|
| `catalog/equipment.json` | category：`main-weapon` / `phantom-weapon` / `accessory`；字段含 `id` / `zh` / `en` / `maxLevel` |
| `catalog/index.ts` + 构建脚本 | 类型扩展；从 DT 导出生成目录并更新 `SOURCE.md` |
| `model/equipment.ts`（新） | 投影 / 添加 / 设等级 / 删除；装备态检查；校验 issue |
| `model/saveModel.ts` | 导出 API；`validate` 汇总 equipment issues |
| `views/EquipmentCategoryTab.vue`（或扩现有 inventory UI） | 等级编辑 + 添加对话框 + 删除确认 |
| `views/ResourcesTab.vue` | 三个新 Tab + 强化风险 Alert |
| `host/i18n/zh.ts` + `en.ts` | Tab 名、等级、坏档/备份警示 |
| `docs/games/phantom-blade-zero.md` + `.en.md` | 可编辑范围与风险 |
| `docs/todo.md` | 勾掉主武 / 影武 / 饰品 |
| `CHANGELOG` | Unreleased 记一笔 |
| 测试 | model 单测（等级换算、装备中拒删、饰品清槽）；UI/module 链按现有材料测例风格 |

模块仍不访问 `fs`、不直接 `invoke` Tauri。

### 数据流

```text
parse → 内部槽 document.Inventory
  → projectEquipment(slot, category)
  → add / setLevel / remove（装备态检查）
  → slot.dirty
  → serializeDirtySlots → Oodle stored + GCM
```

## 风险与诚实边界

- **可能坏档**：唯一件与配装、红点、周目获取字段耦合；未做全量游戏内回归。  
- UI / 文档必须写明：修改前完全退出游戏、依赖宿主自动备份并建议自备副本、Steam 云可能回滚。  
- Catalog 支持 ≠ 效果已验证（与材料页 `thresholdRisk` 同哲学，语气更重）。  
- 饰品 `maxLevel` 为表内基础上限；高周目额外打磨若游戏另算，不在本期建模。

## 验收

1. 合成 / fixture：三类添加 → 改等级 → 序列化再解析字段正确。  
2. 装备中主武 / 影武删除被拒；饰品装备槽被清为 `"None"` 后记录删除。  
3. 未改槽密封块字节透传。  
4. 警示文案中英可见。  
5. 有真档时：副本上添加一件饰品或改主武等级 → 游戏载入不崩（手测记 `HANDTEST`；无档则 CI 仅自动测）。

## 修订原设计非目标

原 [2026-10-30 设计](./2026-10-30-phantom-blade-zero-design.md)「非目标」中「新增……武器、饰品」「编辑装备等级」对本期修订为：允许白名单主武 / 影武 / 饰品的添加与强化等级编辑；其余非目标仍有效。
