# Castlevania: Belmont's Curse 存档模块设计

日期：2026-10-19  
模块 id：`belmonts-curse`  
状态：已设计（待实现计划）  
路径：标准通道 · savesmith-add-game + superpowers brainstorming

## 背景

- 游戏：Castlevania: Belmont's Curse（Steam AppID `4231820`）
- 引擎：Unity IL2CPP（`GameAssembly.dll`）
- 权利人：KONAMI；开发侧路径痕迹含 Evil Empire
- 安装目录（本机示例）：`F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse`
- 存档目录：`%USERPROFILE%\AppData\LocalLow\KONAMI\Castlevania Belmont's Curse`
- 槽位文件：`BuildSave_0.sav` …（约 4 槽）；另有 `PLAYERPREFS.sav`（设置/DLC 旗）、`steam_autocloud.vdf`
- 格式：单行 UTF-8 JSON，无 checksum/HMAC；实测顶层键 `version`、`playerSave`、`worldSaves`、`progressionBoardSave`（样本 `version`≈`1.1.3`）
- Steam Cloud：同步 `*.sav`（配额约 40 MiB）；写档前须退出游戏，建议关云或接受回滚风险
- 社区：存在只读地图导入、备份工具、名称资料站；本模块 **Clean-room** 自写，不捆绑/不移植社区编辑器源码

### 结构指纹（探路）

- `playerSave`：含等级/经验/升级碎片、装备与 `itemsInInventory`（可读字符串 ID，如 `WeaponFistTier1`）、能力 GUID 列表、`worldRoomExplorationStates` 等
- `worldSaves`：Unity 风格 `m_keys`/`m_values`；值含 `currentCompletionItemCount` 与 `savableEntityStates`（实体 **UUID** → `{activated}` / `{openedState,...}` 等）
- 背包字符串 ID 与世界实体 UUID **不是同一套键**（样本交叉命中为 0）——「只改背包不改世界」时再次拾取行为未证实，故新增必须映射双写 + 手测
- 部分数组（如 `receivedMainObjectives`）真档已出现重复 GUID，说明游戏对部分列表容忍重复；仍不能外推到背包，写回对可编辑列表强制去重

## 决策记录（brainstorming）

| 议题 | 选择 |
|------|------|
| 一期深度 | 深编辑为目标，但分阶段交付 |
| 提前解锁风险 | 必须先建立物品/能力 ID ↔ 世界实体映射，双写对齐后才允许新增 |
| 名称素材 | 从本机安装目录抽 id→中英名（无图标） |
| 交付切分 | 一期：标量可写 + 背包/能力/探索只读；二期：映射 + 双写新增 |
| `PLAYERPREFS.sav` | 完全不碰 |
| 架构方案 | 专用 JSON `GameModule` + 能力门闩（否决通用 JSON 树编辑、否决「等全映射才允许任何可写」） |

## 目标

### 一期

1. 登记模块并定位 `BuildSave_*.sav` 槽位（摘要：等级、时长、`saveDate`、`version`）
2. 解析 / 序列化 JSON；未知键整树透传；游戏能载入未编辑往返档与「改一无害标量」档
3. 可写白名单标量（见下）；背包 / 能力 / 探索 Tab 只读
4. 名称表可渐进落地（只读展示）；无表则显示 raw ID
5. registry、i18n、`docs/games`、README 表、CHANGELOG、HANDTEST 节、自动化测试

### 二期

1. 安装目录派生 `catalog` + `mapping`（物品/能力 ↔ 实体状态）
2. 新增动作：列表去重追加 + `savableEntityStates` 双写；无映射拒绝
3. 按类别手测「提前给予 → 游戏内再触发」通过后，才打开对应 UI 门闩

## 非目标

- 编辑 `PLAYERPREFS.sav`（含 DLC/所有权键）
- 通用 JSON 树编辑器；改 `position` / `levelId` 传送；一期改 `equipped*`
- 付费外观/DLC 强开
- 捆绑 AssetRipper 或庞大运行时进便携包
- 提交玩家真档、游戏原始资源包、反编译整库
- 保证 Steam Cloud 冲突安全、联机/成就公平、主机档

## 架构

### 模块边界

新建 `src/games/belmonts-curse/`，`src/host/registry.ts` 静态 import 登记。

| 文件 | 职责 |
|------|------|
| `locate.ts` | 路径模板与识别；**不含** `PLAYERPREFS.sav` |
| `slots.ts` | `BuildSave_N.sav` → 槽位摘要 |
| `parse.ts` | `parse` / `serialize` / `validate` + `BelmontsCurseState` |
| `model/saveModel.ts` | 白名单投影；其余 opaque 透传 |
| `model/jsonRoundtrip.ts` | 往返策略说明与辅助 |
| `catalog/` | 派生名称表（SOURCE + 游戏版本注释） |
| `mapping/`（二期） | pickup / capability 链接表 |
| `actions.ts` | 一期标量；二期受门闩保护的新增 |
| `views/` | Tab UI（`useSessionBindings`） |
| `index.ts` | `GameModule` 导出 + cover |

Catalog 元数据：

- name：`{ zh: '恶魔城：贝尔蒙特的诅咒', en: "Castlevania: Belmont's Curse" }`
- `steamAppId: 4231820`
- `rightsHolder: KONAMI`
- developer：Evil Empire（与公开信息/路径痕迹一致）
- summary：非官方；先退出游戏再改档

### 定位

```ts
windowsPathTemplates: [
  "%USERPROFILE%\\AppData\\LocalLow\\KONAMI\\Castlevania Belmont's Curse"
]
identifyAnyOf / slotFilePatterns: BuildSave_*.sav（实现时用 glob/regex，避免只认 _0）
```

优先 `%USERPROFILE%\AppData\...`，不依赖未注入的 `%APPDATA%`。一期仅保证 Windows 路径；Mac/Linux（SteamDB 上有 EvilEmpire/unity3d 覆盖路径）不在一期验收范围，需要时可二期加模板。

### 数据流

```text
ListedFiles
  → listSlots(BuildSave_N.sav)
  → parse → BelmontsCurseState（投影 + 透传）
  → views / actions
  → validate
  → serialize → 宿主备份 + 原子写
```

铁律：模块不碰 `fs`、不直接 `invoke` Tauri。安装目录扫描仅 **开发机脚本**，输出写入 `catalog/` / `mapping/`；运行时不扫玩家游戏盘。

### 往返约定

无完整性封条。允许 `JSON.stringify` 导致空白/键序与原文件不同，以「游戏可载入」为成功标准；HANDTEST 与文档写明无害差异。禁止按「已知 schema 重生」丢掉未知键。

## 一期可编辑面

### Tab

| Tab | 模式 | 内容 |
|-----|------|------|
| 概览 | 摘要 + 入口 | `version`、`saveDate`、`playTimeInSeconds` 只读 |
| 角色 | **可写** | 标量白名单 |
| 背包 | **只读** | `itemsInInventory`、装备槽；名称表优先 |
| 能力 / Arcana | **只读** | `vaniaMoves`、`progressionPersistentSave`、Arcana 相关列表摘要 |
| 探索 | **只读** | world 条目数、`currentCompletionItemCount`、实体状态计数；不逐实体编辑 |

### 可写白名单（`playerSave`）

| 字段 | 约束（初稿） |
|------|----------------|
| `level` | 整数 ≥ 1 |
| `experienceCurrent` | 整数 ≥ 0 |
| `healthUpgradeFragmentCount` | 整数 ≥ 0 |
| `manaUpgradeFragmentCount` | 整数 ≥ 0 |
| `atkBonusUpgradeCount` | 整数 ≥ 0 |
| `defBonusUpgradeCount` | 整数 ≥ 0 |
| `currentHealth` | 数 ≥ 0（不臆造上限） |
| `currentMana` | 数 ≥ 0 |
| `currentHealChargesCount` | 整数 ≥ 0 |
| `currentTheHermitDeathDefianceCount` | 整数 ≥ 0 |

其余键（含 `worldSaves`、`progressionBoardSave`）透传不动。

### 写回硬门槛（开放角色全白名单 UI 前）

1. 未编辑 `parse → serialize`，游戏能载入  
2. 只改一无害标量（如 `experienceCurrent + 1`），游戏接受且生效  
3. 再铺满白名单编辑

## 二期：映射、双写与门闩

### 派生数据

| 产物 | 用途 |
|------|------|
| `catalog/items.json` 等 | `id` → `{ zh, en }`；注明 SOURCE / 游戏版本 |
| `mapping/pickup-links.json` | `itemId` → `entityGuid`(s) + 目标 state |
| `mapping/capability-links.json` | 能力 GUID ↔ 世界侧（若存在） |

映射未加载或版本不匹配：新增入口关闭；只读名称可回退 raw ID。

### 双写（仅映射命中）

1. 目标列表 **不存在则追加，已存在则 no-op（去重）**  
2. 关联 `savableEntityStates` 写入约定 state  
3. 无映射 → 拒绝动作  
4. 不自动改未分析清的 `progressionBoard`、主线目标数组、坐标

### 手测门槛（每类至少一条，副本）

给予 → 游戏内确认可用 → 再触发原获取点 → 存盘：无拒档、无异常重复、无软锁。未过类不开放新增（或默认禁用的实验开关）。

### 门闩

```text
featureFlags.addItem = mappingLoaded && handtest.inventoryPassed
featureFlags.addAbility = mappingLoaded && handtest.abilityPassed
```

一期二者恒 `false`。名称表可先于映射落地。二期单独 CHANGELOG，不计入一期「完成」。

## 错误处理

| 情况 | 行为 |
|------|------|
| 非 JSON / 缺 `playerSave` | parse 失败，不写盘 |
| `version` 偏差大 | 警告；可只读打开；文档标格式可能变 |
| 白名单类型/下限非法 | validate 拒绝保存 |
| 二期无映射新增 | 拒绝并说明 |
| Steam Cloud / 未退游戏 | 文档免责；宿主备份不替代用户副本习惯 |

## 测试与验收

### 自动化

- 槽位：识别 `BuildSave_*.sav`；`PLAYERPREFS.sav` 不进可编辑槽  
- 夹具 JSON：往返后白名单正确、透传键仍在  
- validate 边界  
- 真档 E2E：环境变量门控；无对照向量则 `skip`；真档不入库

### 手测（`docs/HANDTEST.md`）

1. 退出游戏；建议关云；用副本  
2. 一期标量改档生效且可再存  
3. 只读页与游戏内大致一致  
4. 二期按二次解锁清单勾选

## 风险

| 风险 | 缓解 |
|------|------|
| 云存档覆盖 | 文档强调 |
| JSON 空白/键序变化 | 以游戏可载入为准 |
| 背包与世界不同步 | 一期禁新增；二期双写 + 手测 |
| 补丁改 schema / 映射失效 | 透传；版本标注；门闩可关 |
| DLC / 付费内容 | 不碰 PLAYERPREFS；无强开 UI |
| 许可与包体 | Clean-room；不塞大型运行时 |

## 实现顺序（摘要）

1. 探路结论已写入本文 → 实现计划（writing-plans）  
2. 模块骨架 + locate/slots/parse 往返 + 标量 UI  
3. 写回硬门槛手测通过  
4. 只读深页 + 名称表脚本  
5. registry / i18n / docs / tests  
6.（二期）映射探路 → 双写 → 门闩 → HANDTEST |

## 参考

- 本机存档路径与 SteamDB UFS：`KONAMI/Castlevania Belmont's Curse` + `*.sav`
- 存档酱 skill：`.cursor/skills/savesmith-add-game/`
- 先例模块：明文/投影类可参考 chaos-front 的「未知透传」纪律（编码不同，勿复用 ES3 路径）
