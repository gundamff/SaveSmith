# 混沌银河 2（Chaos Galaxy 2）存档模块

日期：2026-09-16  
范围：完整模块（对齐混沌兵团能力面）+ AssetRipper 名称/图标 + 战役档与 config 图鉴  
实现策略：独立 `GameModule` + 有序二进制 ES3 编解码（未知条目透传）  
状态：设计已确认；实现计划见 `docs/design/2026-09-16-chaos-galaxy-2-plan.md`

## 背景

《混沌银河 2》（Steam AppID `1537910`，开发者 Han Zhiyu，发行 ChaosGalaxyStudio / 2P Games）与《混沌兵团》同厂同作者。存档目录：

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\ChaosGalaxy2`

识别文件：`savedataN.cg2`、`config.cg2`。

与混沌兵团的关键差异：CG2 使用 Easy Save 3 **二进制**（扁平键，如 `Planet1Faction`、`Commander3Exp`、`Fleet1Unit4`）；混沌兵团为 ES3 **JSON**。模块骨架、宿主契约、素材抽取流程对齐混沌兵团，编解码层必须新写，**不复用** `chaos-front/model/es3.ts` 的 JSON 路径。

## 目标

1. 在存档酱中登记并打开 CG2 存档目录与槽位。
2. 二进制往返：解析 → 编辑 → 序列化；未知类型条目透传，避免整档 schema 重生毁掉未建模字段。
3. 提供对齐混沌兵团的编辑面：资源、星球、指挥官、舰队（单位组成）、解锁、图鉴。
4. 从游戏本体抽取目录数据（名称、图标、**等级/属性上限等约束表**），UI 与 `validate` 共同钳制。
5. 遵守存档酱铁律：模块不碰 `fs` / 不直接 `invoke`；宿主负责备份与原子写。

## 非目标

- 不把二进制 ES3 抽进 `@sdk`（仅 CG2 需要；YAGNI）。
- 不改视频分辨率、音量等纯设置键（`config.cg2` 中非图鉴字段默认只读）。
- 一期不对全部 `Faction*` / 剧情旗（如 `IsPrincessWandering`）做裸改，除非单字段验证无害。
- `CustomCommander*` 创建流若不稳，一期只读或后置。
- 指挥官**不增删**实体，只改已有数值（用户选项 C）。
- 舰队/单位槽**增删**仅在键结构摸清且往返验证通过后做；否则只改已有 `Fleet{i}Unit*` 等。
- 不保证 Steam Cloud / 未退游戏时的写档安全（文档与混沌兵团同等免责）。

## 架构

### 模块边界

新建 `src/games/chaos-galaxy-2/`，`src/host/registry.ts` 静态登记；`id: 'chaos-galaxy-2'`。

| 层 | 职责 |
|----|------|
| `model/es3-binary.ts` | 有序二进制 ES3：识别类型编解码；未知条目保留 raw |
| `model/saveModel.ts` | 扁平键 ↔ 资源 / 星球 / 指挥官 / 舰队投影 |
| `model/configModel.ts` | `CommanderCollections` / `UnitCollections` / `EventCollections` bitmask |
| `model/gameData.ts` + `data/` | 抽取产物：名称、图标路径、等级表、属性上限 |
| `model/level.ts`（或等价） | 经验↔等级、钳制辅助，对齐混沌兵团用法 |
| `parse.ts` | `SlotBytes` → state；serialize / validate |
| `locate.ts` / `slots.ts` | 默认路径与槽位摘要 |
| `views/` | Tab UI |
| `scripts/`（仓库级） | AssetRipper 抽取，对齐 `extract-game-data.mjs` 模式 |
| 宿主 | 不变：列目录、读字节、备份、原子写 |

Catalog 元数据：中文「混沌银河 2」/ en「Chaos Galaxy 2」；`steamAppId: 1537910`；`rightsHolder: ChaosGalaxyStudio`；`developer: Han Zhiyu`。

### 数据流

```text
ListedFiles
  → listSlots（savedataN.cg2 摘要 + sessionFiles 含 config.cg2）
  → parse(savedata + config)
  → views 编辑 ChaosGalaxy2State
  → validate（含上限钳制/拒绝非法）
  → serialize → 宿主备份 + 原子写
```

## 存档模型与可编辑面

### 槽位与会话文件

- 战役：`savedataN.cg2`（实现按 `0..N` 扫描存在文件；上限以实机为准，UI 可先按常见多槽展示）。
- 共用：`config.cg2`。
- 打开槽位时 `sessionFiles`：`savedataN.cg2` + `config.cg2`（若存在）。

### 投影与 Tab

| Tab | 主要键 / 实体 | 一期能力 |
|-----|----------------|----------|
| 资源 | `PlayFaction`、`Faction{f}Gold/Supply/Prestige`、`PlayerEconomicsLevel`、`playMonth`、Ark 相关有把握标量 | 改己方势力资源与经济相关标量 |
| 星球 | `Planet{i}*`（实档约 80） | 势力、防御、抵抗、劳工、HQ、建筑/轨道等有把握字段 |
| 指挥官 | `Commander{i}Exp/Admin/Military/Intellect/Breeding/Skills/Star` | **只改数值**；受上限约束 |
| 舰队 | `Fleet{i}*`（`Unit1..14`、Commander、Flagship、Point、Status…） | 改组成与归属；增删后置 |
| 解锁 | `Faction{f}*Unlocked*` 等有把握字段 | 批量/一键解锁 |
| 图鉴 | config bitmask 三段 | 点亮 / 全亮 |

### 数值约束（用户明确要求）

与混沌兵团一致：**约束来自游戏数据抽取，不在 UI 里写死魔法数（除非抽取前临时常量并标注待替换）**。

至少覆盖：

1. **等级 / 经验**：指挥官（及单位若有独立经验）经验上限、星级上限；输入框 `:max` 与「一键拉满」均钳到表内最大值。
2. **属性点**：`Admin` / `Military` / `Intellect` / `Breeding` 等单维上限（以抽取表或实机合法范围为准）。
3. **技能**：`Skills` 结构若为 bitmask/列表，长度与合法技能 ID 范围受目录约束。
4. **星球建筑 / HQ / 轨道等级**：等级字段钳到游戏允许上限。
5. **资源**：`Gold` / `Supply` / `Prestige` 设合理上限或至少非负 + 防溢出（与 CF 信用点策略同类：可编辑、有上限微调或安全上限）。
6. **舰队单位槽**：每舰队 `Unit1..14` 槽位数为硬约束；单位 type ID 必须落在目录内（或允许空槽哨兵值，以实档为准）。

`validate`：越限则自动钳制或返回 `ValidationIssue`（与模块现有风格一致；优先「可写但钳制」对齐 CF 对脏解锁的 sanitize，致命结构错误则禁写）。

## 二进制 ES3

- 条目有序：`key + typeTag + payload`。
- 已识别类型（实档标定：int / bool / string / bool[] 等）可编辑。
- 未识别类型：整段 raw 透传。
- 变长字段通过编解码器重写该条目，禁止盲目原地补丁。
- 验收门槛：未编辑时 `parse → serialize` 与原档字节一致（若存在无害差异必须在实现计划中写明并证明游戏可读）。

## 素材抽取

- 输入：本机 `ChaosGalaxy2_Data` + AssetRipper（GUI 免费版即可）。
- 输出：`src/games/chaos-galaxy-2/data/game-data.json`、`assets/game/`（图标等）、含 **levelTables / 属性上限 / 单位与指挥官目录**。
- 文档：`docs/games/chaos-galaxy-2.md`（+ `.en.md`）写清存档路径、可编辑面、抽取命令、免责声明。

## 错误处理

- 缺 `savedata` → 不可读槽位。
- `config` 缺失：战役仍可编辑；图鉴 Tab 禁用或提示。
- 解析失败 → `ModuleError`，拒绝写入。
- 图鉴 bitmask 长度与目录容量不一致 → 拒绝改写该段。

## 测试与验证

1. 往返字节/语义一致性（未改动）。
2. 手测：改己方 `Gold`、一名指挥官 Exp（顶满到上限）、图鉴点亮一位 → 进游戏可见且不坏档。
3. 越限输入被 UI / validate 钳制。
4. 登记新模块后，混沌兵团及其他模块回归（现有测试命令）。
5. 声称完成前贴出实际测试输出（`verification-before-completion`）。

## 已确认的产品选项

| 项 | 选择 |
|----|------|
| 范围 | D — 对齐混沌兵团完整模块 |
| 素材 | A — AssetRipper 名称 + 图标 |
| config | A — 战役档 + config 图鉴都改 |
| 增删 | C — 指挥官只改数值；单位/舰队增删仅结构允许时 |
| 实现路径 | 方案 1 — 独立模块 + 有序二进制 ES3 |

## 开放实现细节（计划阶段拍板，不阻塞本设计）

- 槽位编号上界与空槽展示文案。
- 舰队增删是否进入一期结束条件，还是明确标为二期。
- 资源「安全上限」具体数字：以抽取表为准；无表时用经手测的保守常量并记入 `game-data` 生成脚本。
