# ACE COMBAT 8 深化：设计说明（C → A → B）

日期：2026-10-04  
状态：Phase C 已落地（文档 + snapshot）；待确认后开 A  
范围：SaveSmith `ace-combat-8` 模块深化（知识 → 轻量补齐 → 功能靠拢）

## 背景

- SaveSmith 已支持 MRP、Checksum 重算、伪二周目，以及通关旗标 / Free Mission / 机库情境 / 部分科技树节点。
- 外部材料：
  - Nexus「100% Campaign Save」(DocSnowHD)：更满的金标准（`FeatureFlagMask=0x3EFE`、树节点 97、涂装 882 等）；光标停在任务 3。
  - [RivaTesu/ac8-save-editor](https://github.com/RivaTesu/ac8-save-editor)（MIT）：完整 GVAS 往返、资产表、机体/涂装/徽章/任务评级/UnlockData 等。
- Nexus 许可：**禁止未授权修改/再分发该存档资产**。不得把整份 100% `Campaign.sav` 作为公开 fixture 提交进仓库；仅允许本地对照，或提取**自有/脱敏**的 ID 列表与字段表。

## 目标（三期，顺序固定）

| 期 | 代号 | 目标 | 成功标准 |
|----|------|------|----------|
| 1 | **C 知识沉淀** | 对照 100% 档 + 参考编辑器，写清字段与校验语义 | 文档可指导 A/B；Checksum 盐来源写明；Feature 位表与参考编辑器一致 |
| 2 | **A 轻量补齐** | 仍做「周目/通关权限」工具，按金标准补缺口 | 「开启通关权限」对齐 100% 档的关键列表与 Ace 难度相关位；不做成全能编辑器 |
| 3 | **B 功能靠拢** | 在 SaveSmith 内增加机体/涂装/徽章/任务等编辑能力 | 覆盖参考编辑器的核心解锁类能力；可分多个子版本发版 |

## 非目标

- 不 fork / 捆绑 ac8-save-editor 的 UI 或 assets.zip（图标版权与体积）。
- 不把 Nexus 100% 整档提交进公开仓库。
- 不做联机 / Online 存档、不做内存修改器。
- B 期不要求第一版就达到参考编辑器的「Advanced 属性树」级别。

## 关键发现（供 C 固化）

1. **Checksum**：`FCrc::MemCrc32(PackedData, FCrc::StrCrc32(TEXT("XnMVqmFJnH!2")))` → 种子即论坛的 `0x41916EBD`。SaveSmith 算法已正确，文档应补盐字符串来源。
2. **FeatureFlagMask**：位序与参考编辑器一致（bit1=AceDifficulty … bit13=DataViewer）。通关档常见 `0x3EFC`；100% 档为 `0x3EFE`（多 AceDifficulty）。
3. **Ace 难度**不仅是 Feature bit：还需 `UnlockData` 中 ID `1800001` 激活，以及 `MenuMiscFlags` 含 `ELiveMenuMiscFlagID::NewAceDifficulty`。
4. **解锁实体**分散在：`OwnedAircrafts`（TMap）、`UnlockedSkinIdList`、`UnlockedEmblemIdList`、`UnlockedMedalIdList`、`OwnedParts`、`UnlockedAircraftTreeNodeIDs`、`CompletedMissionList`（结构体数组）等。
5. **100% 档策略**：任务光标可停在早期（LastCompleted=3），全解锁不依赖卡在 30/31。

## 架构原则

- 继续 **定点补丁 + 未知字节透传**（不强制上完整 GVAS AST，除非 B 期某功能证明补丁不够）。
- 参考编辑器作**语义与字段清单权威**；实现仍落在 `src/games/ace-combat-8/`，符合 SaveSmith 模块约定。
- 数据表（机体/涂装 ID 等）：优先从游戏 pak / 参考编辑器公开 JSON 结构**自行提取**，写入 `src/games/ace-combat-8/data/`；不复制 Nexus 存档二进制。
- 每期可独立发版（建议 C 可不发版或只 docs；A→`0.15.x`；B 拆 `0.16+`）。

## 风险

| 风险 | 缓解 |
|------|------|
| Nexus 许可 | 不入库整档；fixture 继续用自有 mid/cleared，或另做「字段快照 JSON」 |
| 完整 GVAS 成本高 | A 继续补丁；B 按页引入，必要时再引入结构化读写 |
| assets.zip 体积/版权 | SaveSmith 用文本 ID + 可选本地化名，不做游戏内图标包 |
| 与参考编辑器功能重叠 | README 可致谢/链接；定位「存档酱多游戏宿主里的 AC8 模块」 |

## 验收总览

- **C**：`docs/games/ace-combat-8.md`（及 .en）含字段表、Checksum 盐、Feature 位、与参考编辑器差异；设计文档更新。
- **A**：单元测试证明通关权限动作后，关键计数/旗标对齐金标准快照（JSON）；手测伪二周目不卡末盘。
- **B**：至少交付机体拥有 + 涂装列表解锁 + 任务评级（或分 PR）；Checksum 与回归测试绿。
