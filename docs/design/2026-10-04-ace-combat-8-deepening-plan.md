# ACE COMBAT 8 深化 Implementation Plan（C → A → B）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 C（知识沉淀）→ A（轻量通关权限补齐）→ B（向 ac8-save-editor 核心能力靠拢）三期深化 SaveSmith 的 AC8 模块。

**Architecture:** 继续定点 GVAS 补丁与 Checksum 重算；用 100% 档做本地金标准差分（不入库二进制）；语义对齐 [RivaTesu/ac8-save-editor](https://github.com/RivaTesu/ac8-save-editor)；B 期按「一页一能力」扩展 UI，数据表自提自维护。

**Tech Stack:** TypeScript / Vue 3 / Vitest / 现有 `src/games/ace-combat-8`；参考仓库 C# 仅只读对照（可 clone 到 `D:\gits\_refs\ac8-save-editor`）。

**Design:** [2026-10-04-ace-combat-8-deepening-design.md](./2026-10-04-ace-combat-8-deepening-design.md)

## Global Constraints

- Nexus 100% 存档路径（本机）：`D:\zp\Downloads\AC8 100 Percent Save 21 1 2026-10-04T05-38Z KnbP\Campaign.sav` — **禁止**提交该 `.sav` 进公开仓库。
- 参考编辑器：MIT，可阅读算法与字段名；**不**捆绑其 `assets.zip` 图标。
- Checksum：`CRC32(PackedData, seed=StrCrc32_UE("XnMVqmFJnH!2"))` ≡ `0x41916EBD` 初值语义（已实现，文档必须写清）。
- 发版节奏：C 合 docs；A 为 `0.14.2`（仍在 0.14.x）；B 另议。
- 默认中文 UI 文案；文档中英双语同步。
- Never break userspace：已有 MRP / 伪二周目行为保持；扩展「开启通关权限」只能变完整、不能弄坏旧档。

---

## Phase C — 知识沉淀

### Task C1: 固化 Checksum 与 Feature 位文档

**Files:**
- Modify: `docs/games/ace-combat-8.md`
- Modify: `docs/games/ace-combat-8.en.md`
- Modify: `docs/design/2026-10-02-ace-combat-8-design.md`（补盐字符串，链到本期设计）

**Interfaces:**
- Produces: 文档中明确盐 `XnMVqmFJnH!2`、位表 bit1–13、`0x3EFC` vs `0x3EFE`

- [x] **Step 1:** 在游戏文档「封条」节写入参考编辑器恢复的公式与盐字符串（并注明与现实现等价）。
- [x] **Step 2:** 增加 `ELiveFeature` 位表（与 `features.ts` / 参考编辑器 `FeatureNames` 对齐）。
- [x] **Step 3:** 说明 Ace 难度三件套：`FeatureFlagMask` bit1 + `UnlockData` id `1800001` + `MenuMiscFlag NewAceDifficulty`。
- [x] **Step 4:** 提交（若用户要求发版/提交时）：`docs(ac8): checksum salt and feature bit table`

### Task C2: 金标准字段快照（JSON，无整档）

**Files:**
- Create: `src/games/ace-combat-8/data/reference-100pct-snapshot.json`（或 `docs/design/ac8-100pct-field-snapshot.json` — 优先 data，供 A 测试引用）
- Create: `scripts/ac8-snapshot-save.mjs`（本地脚本：读任意 Campaign.sav → 输出计数与关键标量/列表哈希或完整 ID 数组）

**Interfaces:**
- Produces: JSON 含 `featureFlagMask`, `completionCount`, `lastCompleted/Played`, 各 `Unlocked*List` 的 **count + sorted id array**（体积大但可接受；若皮肤 882 过大可只存 sorted ids）
- Consumes: 本机 100% `Campaign.sav`（脚本参数传入路径）

- [x] **Step 1:** 写 `scripts/ac8-snapshot-save.mjs`，对 100% 档跑一遍，生成 snapshot JSON。
- [x] **Step 2:** 对现有 `campaign-cleared.sav` / `campaign-midgame.sav` 也生成旁路对比（可放 `docs/design/` 或脚本输出到 stdout，不强制入库 mid 快照）。
- [x] **Step 3:** 在 `ace-combat-8.md` 增加「参考档差异摘要」表（100% vs cleared vs mid 的 count 列）。
- [x] **Step 4:** 确认 snapshot **不含**整文件 base64；license 注记：ID 列表来自本地分析/自提取，非再分发 Nexus 二进制。

### Task C3: 对照参考编辑器能力矩阵

**Files:**
- Modify: `docs/design/2026-10-04-ace-combat-8-deepening-design.md` 或新建一节于游戏文档「开发者 / 字段地图」
- Modify: `docs/games/ace-combat-8.md`（开发者小节）

**Interfaces:**
- Produces: 表格列 = 字段/能力 | SaveSmith 现状 | 参考编辑器 | 计划期（C/A/B）

至少覆盖：

| 能力 | 现状 | 计划 |
|------|------|------|
| MRP / Checksum | 有 | — |
| FeatureFlag / FreeMission / Hangar / Tree merge | 部分 | A 对齐 100% |
| Ace 难度三件套 | 无 | A |
| OwnedAircrafts / Skins / Emblems / Medals / Parts | 无 | B |
| CompletedMissionList 评级 | 无 | B |
| System.sav | 无 | B 可选 / 非必须 |
| UnlockData 全表 | 无 | A 最小（Ace）+ B 扩展 |
| Advanced 属性树 | 无 | 不做 |

- [x] **Step 1:** 读 `CampaignModel.cs` / `MainWindow.xaml.cs` 补全矩阵。
- [x] **Step 2:** 写入文档；Phase C 收尾。
- [x] **Step 3:** 用户确认 C 完成后再开 A（门禁）。

**Phase C 完成门禁：** 文档 + snapshot JSON 齐；无产品代码强制变更（允许注释/常量重命名）。

---

## Phase A — 轻量通关权限补齐

### Task A1: 测试先红 — 通关权限对齐 snapshot

**Files:**
- Modify: `tests/ace-combat-8/campaignSave.spec.ts`
- Create: `tests/ace-combat-8/fixtures/reference-100pct-snapshot.json`（从 Phase C 的 data 复制或 symlink 式引用 `src/.../data/`）

**Interfaces:**
- Consumes: `applyPostCampaignUnlocks`, snapshot counts/ids
- Produces: 失败测试描述期望：mask 含 `0x3EFE` 或至少 bit1+cleared；hangar/free=31；tree ⊇ snapshot tree；后续 A2/A3 再加 skin/ace

- [ ] **Step 1:** 写测试：mid 档 `applyPostCampaignUnlocks` 后 `featureFlagMask & 0x3EFE === 0x3EFE`（或 `\| AceDifficulty`）。
- [ ] **Step 2:** 写测试：tree / hangar / free 与 snapshot 集合关系（⊇ 或 count 下界）。
- [ ] **Step 3:** `npx vitest run tests/ace-combat-8` — 确认红灯（在实现前）。

### Task A2: Ace 难度三件套

**Files:**
- Modify: `src/games/ace-combat-8/model/gvas.ts`（若需 Set/Enum/UnlockData 结构定位）
- Modify: `src/games/ace-combat-8/model/campaignSave.ts` — `applyPostCampaignUnlocks`
- Modify: `src/games/ace-combat-8/model/features.ts` — `ACE_DIFFICULTY_BIT`, unlock id 常量

**Interfaces:**
- Produces: `enableAceDifficulty(patch)`：Feature bit1 + UnlockData `1800001` + MenuMiscFlag
- 参考：`MainWindow.xaml.cs` `UnlockAce()`

- [ ] **Step 1:** 在 mid/100% 上定位 `UnlockData` / `MenuMiscFlags` 二进制布局，写最小查找/改写（能改 bool/枚举即可，不求完整结构编辑器）。
- [ ] **Step 2:** 实现 `enableAceDifficulty`；由 `applyPostCampaignUnlocks` 调用。
- [ ] **Step 3:** 测试：应用后 HasFeature(AceDifficulty)；如可解析则 UnlockData 激活。
- [ ] **Step 4:** 提交：`feat(ac8): unlock Ace difficulty with flag trio`

### Task A3: 合并 100% 级列表（树 / 涂装 / 徽章 / 勋章下限）

**Files:**
- Modify: `src/games/ace-combat-8/model/features.ts` 或 `data/*.json` — 自 snapshot 提取的 ID 列表
- Modify: `src/games/ace-combat-8/model/campaignSave.ts` — merge 多个 UInt32 数组
- Modify: `src/games/ace-combat-8/views/ProgressTab.vue` — 显示皮肤/徽章计数
- Modify: i18n `zh.ts` / `en.ts`

**Interfaces:**
- Produces: `applyPostCampaignUnlocks` 合并：
  - `UnlockedAircraftTreeNodeIDs` / Newly* ← snapshot（≥97）
  - `UnlockedSkinIdList` / Newly* ← snapshot
  - `UnlockedEmblemIdList` / Newly* ← snapshot
  - `UnlockedMedalIdList` / Newly* ← snapshot（可选但推荐）
- 不强制本阶段改 `OwnedAircrafts` Map（留给 B）

- [ ] **Step 1:** 从 snapshot 生成 `cleared`/`full` ID 常量文件（TS 或 JSON import）。
- [ ] **Step 2:** 通用 `mergeUInt32ArrayByName` 已有则复用；扩展调用点。
- [ ] **Step 3:** 测试对齐 snapshot 集合；Checksum 仍有效。
- [ ] **Step 4:** 更新用户文档：通关权限现含列表级解锁；涂装数量以游戏版本为准。
- [ ] **Step 5:** 提交：`feat(ac8): merge full unlock lists on post-clear`

### Task A4: 手测清单 + 发版 A

**Files:**
- Modify: `docs/HANDTEST.md` 或 `docs/games/ace-combat-8.md` 手测节
- Modify: `CHANGELOG.md` / `CHANGELOG.en.md`、版本号 → `0.15.0`

- [ ] **Step 1:** 手测：mid 档 → 开启通关权限 → 进游戏确认科技树/涂装/Ace 难度入口；伪二周目光标为 0。
- [ ] **Step 2:** 按 `docs/RELEASE.md` 打 `v0.15.0`。

**Phase A 完成门禁：** 测试绿；手测通关权限不再「看起来没解锁」；不引入机体 Map 编辑 UI。

---

## Phase B — 向参考编辑器核心能力靠拢

> B 拆多个可发版切片；每切片独立 PR。顺序建议：B1 机体 → B2 涂装/徽章 → B3 任务评级 → B4（可选）UnlockData/System。

### Task B1: 数据表骨架 + 机体拥有（OwnedAircrafts）

**Files:**
- Create: `src/games/ace-combat-8/data/aircraft.json`（id + 显示名；从游戏/自提，不抄 assets 图）
- Create: `src/games/ace-combat-8/model/ownedAircraft.ts`
- Create: `src/games/ace-combat-8/views/AircraftTab.vue`
- Modify: `views/index.ts`, `index.ts` catalog views, i18n
- Test: `tests/ace-combat-8/ownedAircraft.spec.ts`

**Interfaces:**
- Produces: 读/写 `OwnedAircrafts` TMap\<UInt32, Byte\>；勾选拥有时同步 tree node / NewlyOwned（对齐参考编辑器行为）
- Consumes: gvas Map 定位 API（本任务需新增 `findMapProperty` 或专用扫描）

- [ ] **Step 1:** 逆向/对照 mid 档确认 Map 布局；写失败测试。
- [ ] **Step 2:** 实现读写 + AircraftTab（搜索 + 全选当前过滤）。
- [ ] **Step 3:** Checksum；提交：`feat(ac8): aircraft ownership tab`

### Task B2: 涂装 / 徽章页

**Files:**
- Create: `data/skins.json`, `data/emblems.json`（或合并 catalog）
- Create: `views/SkinsTab.vue`（或 UnlockCatalog 通用组件）
- Modify: campaignSave merge helpers 复用 SetContains 语义

**Interfaces:**
- Produces: UI 切换 `UnlockedSkinIdList` / `UnlockedEmblemIdList`（+ Newly*）
- 参考编辑器卡片 UI 可简化为表格/复选列表（SaveSmith 风格）

- [ ] **Step 1:** 通用 `UnlockIdListTab` 组件（id 列表 + 搜索 + 批量）。
- [ ] **Step 2:** 接皮肤、徽章两套数据。
- [ ] **Step 3:** 测试 + 提交：`feat(ac8): skins and emblems tabs`

### Task B3: 任务评级（CompletedMissionList）

**Files:**
- Create: `model/missionRecords.ts`
- Create: `views/MissionsTab.vue`
- Test: 基于 mid 档「已有 mission record 才能加难度」约束（与参考编辑器一致）

**Interfaces:**
- Produces: 展示 31 关；对已存在记录设置 HighestRank / 添加难度条目（克隆模板结构，参考 `CampaignModel.AddDifficulty`）
- 明确：**不能**凭空为从未打过的关插入完整 Struct（除非 B3b 证明可从模板克隆整关）

- [ ] **Step 1:** 解析 `CompletedMissionList` 只读展示 + 单测。
- [ ] **Step 2:** 写评级 / 添加难度（有模板才写）。
- [ ] **Step 3:** 一键「已有记录全部 S」（Elite/Ace 列）——对齐参考编辑器 overview 快捷方式。
- [ ] **Step 4:** 提交：`feat(ac8): mission ranks tab`

### Task B4（可选）: UnlockData 浏览器 + System.sav

**Files:**
- `views/UnlockDataTab.vue`（激活标志列表）
- `systemSave.ts` + Options 只读或少量字段

- [ ] **Step 1:** 评估工作量；若 A 已覆盖 Ace，本任务降级为「高级」折叠页。
- [ ] **Step 2:** System.sav 仅在有明确用户需求时做。

### Task B5: B 期文档与发版

- [ ] 更新 `docs/games/ace-combat-8.md` 能力表与截图。
- [ ] CHANGELOG；按切片发 `0.16.0` / `0.17.0`…
- [ ] README 支持游戏表状态更新；可友情链接参考编辑器（致谢其公开逆向）。

**Phase B 完成门禁：** 机体 + 涂装/徽章 + 任务评级 均有测试与手测；未知字段仍透传；大文件保存后游戏可加载。

---

## 建议执行方式

1. 先完整跑完 **Phase C**（文档/快照），停下来让维护者确认矩阵。
2. **Phase A** 一次 PR 发 `0.15.0`。
3. **Phase B** 每 Tab 一个 PR，避免巨型 diff。

本地对照命令备忘：

```bash
node scripts/ac8-snapshot-save.mjs "D:/zp/Downloads/AC8 100 Percent Save 21 1 2026-10-04T05-38Z KnbP/Campaign.sav"
```

参考仓库（只读）：

```text
D:\gits\_refs\ac8-save-editor
```

---

## 任务索引

| ID | 期 | 交付 |
|----|----|------|
| C1 | C | Checksum/Feature 文档 |
| C2 | C | 100% 字段 snapshot JSON + 脚本 |
| C3 | C | 能力矩阵 / 门禁 |
| A1 | A | 红灯测试 |
| A2 | A | Ace 三件套 |
| A3 | A | 全量列表 merge |
| A4 | A | 手测 + 0.15.0 |
| B1 | B | 机体 Tab |
| B2 | B | 涂装/徽章 |
| B3 | B | 任务评级 |
| B4 | B | 可选 UnlockData/System |
| B5 | B | 文档与切片发版 |
